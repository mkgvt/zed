package ingest

import (
	"context"
	"io"
	"io/ioutil"
	"os"
	"sync/atomic"

	"github.com/brimsec/zq/api"
	"github.com/brimsec/zq/driver"
	"github.com/brimsec/zq/pkg/ctxio"
	"github.com/brimsec/zq/pkg/iosrc"
	"github.com/brimsec/zq/pkg/nano"
	"github.com/brimsec/zq/ppl/archive"
	"github.com/brimsec/zq/ppl/zqd/pcapanalyzer"
	"github.com/brimsec/zq/ppl/zqd/pcapstorage"
	"github.com/brimsec/zq/ppl/zqd/storage/archivestore"
	"github.com/brimsec/zq/zbuf"
	"github.com/brimsec/zq/zio"
	"github.com/brimsec/zq/zio/ndjsonio"
	"github.com/brimsec/zq/zng/resolver"
	"golang.org/x/sync/errgroup"
)

type archivePcapOp struct {
	cleanupfns     []func()
	err            error
	done           chan struct{}
	pcapuri        iosrc.URI
	pcapstore      *pcapstorage.Store
	store          *archivestore.Storage
	writer         *archive.Writer
	zeek, suricata pcapanalyzer.Launcher
	zctx           *resolver.Context

	// snap not used for archive store pcap ingest. Here for functional parity
	// with legacyPcapOp. Can be removed once filestore has been deprecated
	snap chan struct{}

	// stat fields
	startTime      nano.Ts
	pcapBytesTotal int64
	pcapCounter    *writeCounter
}

func newArchivePcapOp(ctx context.Context, logstore *archivestore.Storage, pcapstore *pcapstorage.Store, pcapuri iosrc.URI, suricata, zeek pcapanalyzer.Launcher) (PcapOp, []string, error) {
	info, err := iosrc.Stat(ctx, pcapuri)
	if err != nil {
		return nil, nil, err
	}
	warn := make(chan string)
	go func() {
		err = pcapstore.Update(ctx, pcapuri, warn)
		close(warn)
	}()
	var warnings []string
	for w := range warn {
		warnings = append(warnings, w)
	}
	if err != nil {
		return nil, warnings, err
	}
	p := &archivePcapOp{
		done:      make(chan struct{}),
		pcapstore: pcapstore,
		store:     logstore,
		pcapuri:   pcapuri,
		snap:      make(chan struct{}),
		suricata:  suricata,
		writer:    logstore.NewWriter(ctx),
		zeek:      zeek,
		zctx:      resolver.NewContext(),

		startTime:      nano.Now(),
		pcapBytesTotal: info.Size(),
		pcapCounter:    &writeCounter{},
	}
	go func() {
		p.err = p.run(ctx)
		for _, fn := range p.cleanupfns {
			fn()
		}
		close(p.done)
	}()
	return p, warnings, nil
}

func (p *archivePcapOp) run(ctx context.Context) error {
	group, ctx := errgroup.WithContext(ctx)
	pcapfile, err := iosrc.NewReader(ctx, p.pcapuri)
	if err != nil {
		return err
	}
	defer pcapfile.Close()
	// Keeps track of bytes read from pcapfile.
	r := io.TeeReader(pcapfile, p.pcapCounter)

	group, zreaders, err := p.runAnalyzers(ctx, group, r)
	if err != nil {
		return err
	}
	combiner := zbuf.NewCombiner(zreaders, p.store.NativeOrder().RecordLess())
	defer combiner.Close()

	if err := zbuf.CopyWithContext(ctx, p.writer, combiner); err != nil {
		p.writer.Close()
		return err
	}
	err = p.writer.Close()
	if errg := group.Wait(); err == nil {
		err = errg
	}
	return err
}

func (p *archivePcapOp) runAnalyzers(ctx context.Context, group *errgroup.Group, pcapstream io.Reader) (*errgroup.Group, []zbuf.Reader, error) {
	var pipes []*io.PipeWriter
	var zreaders []zbuf.Reader
	if p.zeek != nil {
		pw, dr, err := p.runAnalyzer(ctx, group, p.zeek)
		if err != nil {
			return nil, nil, err
		}
		pipes = append(pipes, pw)
		zreaders = append(zreaders, dr)
	}
	if p.suricata != nil {
		pw, dr, err := p.runAnalyzer(ctx, group, p.suricata)
		if err != nil {
			return nil, nil, err
		}
		pipes = append(pipes, pw)
		// Suricata logs need flowgraph to rename timestamp fields into ts.
		tr, err := driver.NewReader(ctx, suricataTransform, p.zctx, dr)
		if err != nil {
			return nil, nil, err
		}
		zreaders = append(zreaders, tr)
	}
	group.Go(func() error {
		var writers []io.Writer
		for _, p := range pipes {
			writers = append(writers, p)
		}
		_, err := ctxio.Copy(ctx, io.MultiWriter(writers...), pcapstream)
		// Once copy has completed, close pipe writers which will instruct the
		// analyzer processes to exit.
		for _, p := range pipes {
			p.Close()
		}
		return err
	})
	return group, zreaders, nil
}

func (p *archivePcapOp) runAnalyzer(ctx context.Context, group *errgroup.Group, ln pcapanalyzer.Launcher) (*io.PipeWriter, zbuf.Reader, error) {
	logdir, err := ioutil.TempDir("", "zqd-pcap-ingest-")
	if err != nil {
		return nil, nil, err
	}
	p.cleanup(func() { os.RemoveAll(logdir) })
	pr, pw := io.Pipe()
	waiter, err := ln(ctx, pr, logdir)
	if err != nil {
		return nil, nil, err
	}
	dr, err := newLogTailer(p.zctx, logdir, zio.ReaderOpts{
		JSON: ndjsonio.ReaderOpts{TypeConfig: suricataTC},
	})
	if err != nil {
		return nil, nil, err
	}
	group.Go(func() error {
		err := waiter.Wait()
		// Analyzer has either encountered an error or received an EOF from the
		// pcap stream. Tell DirReader to stop tail files, which will in turn
		// cause an EOF on zbuf.Read stream when remaining data has been read.
		if errs := dr.Stop(); err == nil {
			err = errs
		}
		return err
	})
	return pw, dr, nil
}

func (p *archivePcapOp) Status() api.PcapPostStatus {
	importStats := p.writer.Stats()
	return api.PcapPostStatus{
		Type:               "PcapPostStatus",
		StartTime:          p.startTime,
		UpdateTime:         nano.Now(),
		PcapSize:           p.pcapBytesTotal,
		PcapReadSize:       p.pcapCounter.Bytes(),
		DataChunksWritten:  importStats.DataChunksWritten,
		RecordsWritten:     importStats.RecordsWritten,
		RecordBytesWritten: importStats.RecordBytesWritten,
	}
}

type writeCounter struct {
	writer io.Writer
	count  int64
}

func (w *writeCounter) Write(b []byte) (int, error) {
	atomic.AddInt64(&w.count, int64(len(b)))
	return len(b), nil
}

func (w *writeCounter) Bytes() int64 {
	return atomic.LoadInt64(&w.count)
}

// Snap for archivePcapOp is functionally useless. It is only here to satisfy
// the PcapOp interface. This will go away once filestore is deprecated.
func (p *archivePcapOp) Snap() <-chan struct{} {
	return p.snap
}

// Err returns the an error if an error occurred while the ingest process was
// running. If the process is still running Err will wait for the process to
// complete before returning.
func (p *archivePcapOp) Err() error {
	<-p.done
	return p.err
}

func (p *archivePcapOp) cleanup(fn func()) {
	p.cleanupfns = append(p.cleanupfns, fn)
}

// Done returns a chan that emits when the ingest process is complete.
func (p *archivePcapOp) Done() <-chan struct{} {
	return p.done
}