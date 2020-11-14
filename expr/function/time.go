package function

import (
	"time"

	"github.com/brimsec/zq/expr/coerce"
	"github.com/brimsec/zq/expr/result"
	"github.com/brimsec/zq/pkg/nano"
	"github.com/brimsec/zq/zng"
)

type iso struct {
	result.Buffer
}

func (i *iso) Call(args []zng.Value) (zng.Value, error) {
	zv := args[0]
	if !zv.IsStringy() {
		return badarg("iso")
	}
	ts, e := time.Parse(time.RFC3339Nano, string(zv.Bytes))
	if e != nil {
		return badarg("iso")
	}
	return zng.Value{zng.TypeTime, i.Time(nano.Ts(ts.UnixNano()))}, nil
}

type sec struct {
	result.Buffer
}

func (s *sec) Call(args []zng.Value) (zng.Value, error) {
	zv := args[0]
	ns, ok := coerce.ToInt(zv)
	if !ok {
		sec, ok := coerce.ToFloat(zv)
		if !ok {
			return badarg("sec")
		}
		ns = int64(1e9 * sec)
	} else {
		ns *= 1_000_000_000
	}
	return zng.Value{zng.TypeInt64, s.Int(ns)}, nil
}

type msec struct {
	result.Buffer
}

func (m *msec) Call(args []zng.Value) (zng.Value, error) {
	zv := args[0]
	ns, ok := coerce.ToInt(zv)
	if !ok {
		ms, ok := coerce.ToFloat(zv)
		if !ok {
			return badarg("msec")
		}
		ns = int64(1e6 * ms)
	} else {
		ns *= 1_000_000
	}
	return zng.Value{zng.TypeInt64, m.Int(ns)}, nil
}

type usec struct {
	result.Buffer
}

func (u *usec) Call(args []zng.Value) (zng.Value, error) {
	zv := args[0]
	ns, ok := coerce.ToInt(zv)
	if !ok {
		us, ok := coerce.ToFloat(zv)
		if !ok {
			return badarg("usec")
		}
		ns = int64(1000. * us)
	} else {
		ns *= 1000
	}
	return zng.Value{zng.TypeInt64, u.Int(ns)}, nil
}

type trunc struct {
	result.Buffer
}

func (t *trunc) Call(args []zng.Value) (zng.Value, error) {
	zv := args[0]
	ts, ok := coerce.ToTime(zv)
	if !ok {
		return badarg("trunc")
	}
	dur, ok := coerce.ToInt(args[1])
	if !ok {
		return badarg("trunc")
	}
	dur *= 1_000_000_000
	return zng.Value{zng.TypeTime, t.Time(nano.Ts(ts.Trunc(dur)))}, nil
}