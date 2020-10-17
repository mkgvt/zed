package reducer

//XXX in new model, need to do a semantic check on the reducers since they
// are compiled at runtime and you don't want to run a long time then catch
// the error that could have been caught earlier

import (
	"errors"
	"fmt"

	"github.com/brimsec/zq/anymath"
	"github.com/brimsec/zq/expr"
	"github.com/brimsec/zq/zng"
	"github.com/brimsec/zq/zng/resolver"
)

// MaxValueSize is a limit on an individual aggregation value since sets
// and arrays could otherwise grow without limit leading to a single record
// value that cannot fit in memory.
const MaxValueSize = 20 * 1024 * 1024

var (
	ErrBadValue      = errors.New("bad value")
	ErrFieldRequired = errors.New("field parameter required")
)

type Maker func(*resolver.Context) Interface

type Interface interface {
	Consume(*zng.Record)
	Result() zng.Value
}

type Decomposable interface {
	Interface
	ConsumePart(zng.Value) error
	ResultPart(*resolver.Context) (zng.Value, error)
}

type Stats struct {
	TypeMismatch  int64
	FieldNotFound int64
	MemExceeded   int64
}

type Reducer struct {
	Stats
	where expr.Evaluator
}

func (r *Reducer) filter(rec *zng.Record) bool {
	if r.where == nil {
		return false
	}
	zv, err := r.where.Eval(rec)
	if err != nil {
		return true
	}
	return !zng.IsTrue(zv.Bytes)
}

func NewMaker(op string, arg, where expr.Evaluator) (Maker, error) {
	if arg == nil && op != "count" {
		// Count is the only reducer that doesn't require an operator.
		return nil, ErrFieldRequired
	}
	r := Reducer{where: where}
	switch op {
	case "count":
		return func(*resolver.Context) Interface {
			return &Count{Reducer: r, arg: arg}
		}, nil
	case "first":
		return func(*resolver.Context) Interface {
			return &First{Reducer: r, arg: arg}
		}, nil
	case "last":
		return func(*resolver.Context) Interface {
			return &Last{Reducer: r, arg: arg}
		}, nil
	case "avg":
		return func(*resolver.Context) Interface {
			return &Avg{Reducer: r, arg: arg}
		}, nil
	case "countdistinct":
		return func(*resolver.Context) Interface {
			return NewCountDistinct(arg, where)
		}, nil
	case "sum":
		return func(*resolver.Context) Interface {
			return newMathReducer(anymath.Add, arg, where)
		}, nil
	case "min":
		return func(*resolver.Context) Interface {
			return newMathReducer(anymath.Min, arg, where)
		}, nil
	case "max":
		return func(*resolver.Context) Interface {
			return newMathReducer(anymath.Max, arg, where)
		}, nil
	case "union":
		return func(zctx *resolver.Context) Interface {
			return newUnion(zctx, arg, where)
		}, nil
	case "collect":
		return func(zctx *resolver.Context) Interface {
			return &Collect{Reducer: r, zctx: zctx, arg: arg}
		}, nil
	case "and":
		return func(*resolver.Context) Interface {
			return &Logical{Reducer: r, arg: arg, and: true, val: true}
		}, nil
	case "or":
		return func(*resolver.Context) Interface {
			return &Logical{Reducer: r, arg: arg}
		}, nil
	default:
		return nil, fmt.Errorf("unknown reducer op: %s", op)
	}
}
