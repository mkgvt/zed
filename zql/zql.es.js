// from https://github.com/fitzgen/glob-to-regexp

function Reglob(glob, opts) {
  if (typeof glob !== 'string') {
    throw new TypeError('Expected a string');
  }

  var str = String(glob);

  // The regexp we are building, as a string.
  var reStr = "";

  // Whether we are matching so called "extended" globs (like bash) and should
  // support single character matching, matching ranges of characters, group
  // matching, etc.
  var extended = opts ? !!opts.extended : false;

  // When globstar is _false_ (default), '/foo/*' is translated a regexp like
  // '^\/foo\/.*$' which will match any string beginning with '/foo/'
  // When globstar is _true_, '/foo/*' is translated to regexp like
  // '^\/foo\/[^/]*$' which will match any string beginning with '/foo/' BUT
  // which does not have a '/' to the right of it.
  // E.g. with '/foo/*' these will match: '/foo/bar', '/foo/bar.txt' but
  // these will not '/foo/bar/baz', '/foo/bar/baz.txt'
  // Lastely, when globstar is _true_, '/foo/**' is equivelant to '/foo/*' when
  // globstar is _false_
  var globstar = opts ? !!opts.globstar : false;

  // If we are doing extended matching, this boolean is true when we are inside
  // a group (eg {*.html,*.js}), and false otherwise.
  var inGroup = false;

  // RegExp flags (eg "i" ) to pass in to RegExp constructor.
  var flags = opts && typeof( opts.flags ) === "string" ? opts.flags : "";

  var c;
  for (var i = 0, len = str.length; i < len; i++) {
    c = str[i];

    switch (c) {
    case "/":
    case "$":
    case "^":
    case "+":
    case ".":
    case "(":
    case ")":
    case "=":
    case "!":
    case "|":
      reStr += "\\" + c;
      break;

    case "?":
      if (extended) {
        reStr += ".";
        break;
      }

    case "[":
    case "]":
      if (extended) {
        reStr += c;
        break;
      }

    case "{":
      if (extended) {
        inGroup = true;
        reStr += "(";
        break;
      }

    case "}":
      if (extended) {
        inGroup = false;
        reStr += ")";
        break;
      }

    case ",":
      if (inGroup) {
        reStr += "|";
        break;
      }
      reStr += "\\" + c;
      break;

    case '\\':
      if (str[i+1] == '*') {
        i++;
        reStr += '\\*';
      } else {
        reStr += c;
      }
      break;

    case "*":
      // Move over all consecutive "*"'s.
      // Also store the previous and next characters
      var prevChar = str[i - 1];
      var starCount = 1;
      while(str[i + 1] === "*") {
        starCount++;
        i++;
      }
      var nextChar = str[i + 1];

      if (!globstar) {
        // globstar is disabled, so treat any number of "*" as one
        reStr += ".*";
      } else {
        // globstar is enabled, so determine if this is a globstar segment
        var isGlobstar = starCount > 1                      // multiple "*"'s
          && (prevChar === "/" || prevChar === undefined)   // from the start of the segment
          && (nextChar === "/" || nextChar === undefined);   // to the end of the segment

        if (isGlobstar) {
          // it's a globstar, so match zero or more path segments
          reStr += "((?:[^/]*(?:\/|$))*)";
          i++; // move over the "/"
        } else {
          // it's not a globstar, so only match one path segment
          reStr += "([^/]*)";
        }
      }
      break;

    default:
      reStr += c;
    }
  }

  // When regexp 'g' flag is specified don't
  // constrain the regular expression with ^ & $
  if (!flags || !~flags.indexOf('g')) {
    reStr = "^" + reStr + "$";
  }

  return reStr;
}


function IsGlobby(s) {
  return (s.indexOf("*") >= 0 || s.indexOf("?") >= 0);
}

var reglob = {
  Reglob,
  IsGlobby,
};

function peg$subclass(child, parent) {
  function ctor() { this.constructor = child; }
  ctor.prototype = parent.prototype;
  child.prototype = new ctor();
}

function peg$SyntaxError(message, expected, found, location) {
  this.message  = message;
  this.expected = expected;
  this.found    = found;
  this.location = location;
  this.name     = "SyntaxError";

  if (typeof Error.captureStackTrace === "function") {
    Error.captureStackTrace(this, peg$SyntaxError);
  }
}

peg$subclass(peg$SyntaxError, Error);

peg$SyntaxError.buildMessage = function(expected, found) {
  var DESCRIBE_EXPECTATION_FNS = {
        literal: function(expectation) {
          return "\"" + literalEscape(expectation.text) + "\"";
        },

        "class": function(expectation) {
          var escapedParts = "",
              i;

          for (i = 0; i < expectation.parts.length; i++) {
            escapedParts += expectation.parts[i] instanceof Array
              ? classEscape(expectation.parts[i][0]) + "-" + classEscape(expectation.parts[i][1])
              : classEscape(expectation.parts[i]);
          }

          return "[" + (expectation.inverted ? "^" : "") + escapedParts + "]";
        },

        any: function(expectation) {
          return "any character";
        },

        end: function(expectation) {
          return "end of input";
        },

        other: function(expectation) {
          return expectation.description;
        }
      };

  function hex(ch) {
    return ch.charCodeAt(0).toString(16).toUpperCase();
  }

  function literalEscape(s) {
    return s
      .replace(/\\/g, '\\\\')
      .replace(/"/g,  '\\"')
      .replace(/\0/g, '\\0')
      .replace(/\t/g, '\\t')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/[\x00-\x0F]/g,          function(ch) { return '\\x0' + hex(ch); })
      .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return '\\x'  + hex(ch); });
  }

  function classEscape(s) {
    return s
      .replace(/\\/g, '\\\\')
      .replace(/\]/g, '\\]')
      .replace(/\^/g, '\\^')
      .replace(/-/g,  '\\-')
      .replace(/\0/g, '\\0')
      .replace(/\t/g, '\\t')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/[\x00-\x0F]/g,          function(ch) { return '\\x0' + hex(ch); })
      .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return '\\x'  + hex(ch); });
  }

  function describeExpectation(expectation) {
    return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
  }

  function describeExpected(expected) {
    var descriptions = new Array(expected.length),
        i, j;

    for (i = 0; i < expected.length; i++) {
      descriptions[i] = describeExpectation(expected[i]);
    }

    descriptions.sort();

    if (descriptions.length > 0) {
      for (i = 1, j = 1; i < descriptions.length; i++) {
        if (descriptions[i - 1] !== descriptions[i]) {
          descriptions[j] = descriptions[i];
          j++;
        }
      }
      descriptions.length = j;
    }

    switch (descriptions.length) {
      case 1:
        return descriptions[0];

      case 2:
        return descriptions[0] + " or " + descriptions[1];

      default:
        return descriptions.slice(0, -1).join(", ")
          + ", or "
          + descriptions[descriptions.length - 1];
    }
  }

  function describeFound(found) {
    return found ? "\"" + literalEscape(found) + "\"" : "end of input";
  }

  return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
};

function peg$parse(input, options) {
  options = options !== void 0 ? options : {};

  var peg$FAILED = {},

      peg$startRuleFunctions = { start: peg$parsestart, Expression: peg$parseExpression },
      peg$startRuleFunction  = peg$parsestart,

      peg$c0 = function(ast) { return ast },
      peg$c1 = function(procs) {
            let filt =  makeFilterProc(makeMatchAll());
            return makeSequentialProc([filt, ... procs])
          },
      peg$c2 = function(s, rest) {
            if (rest.length == 0) {
                return s
            } else {
                return makeSequentialProc([s, ... rest])
            }
          },
      peg$c3 = function(s) {
            return makeSequentialProc([s])
          },
      peg$c4 = function(first, rest) {
            if (rest) {
              return [first, ... rest]
            } else {
              return [first]
            }
          },
      peg$c5 = "|",
      peg$c6 = peg$literalExpectation("|", false),
      peg$c7 = function(p) { return p },
      peg$c8 = function(expr) {
            return makeFilterProc(expr)
          },
      peg$c9 = function(first, rest) {
            return makeOrChain(first, rest)
          },
      peg$c10 = function(t) { return t },
      peg$c11 = function(first, rest) {
            return makeAndChain(first, rest)
          },
      peg$c12 = function(f) { return f },
      peg$c13 = "!",
      peg$c14 = peg$literalExpectation("!", false),
      peg$c15 = function(e) {
            return makeLogicalNot(e)
          },
      peg$c16 = "-",
      peg$c17 = peg$literalExpectation("-", false),
      peg$c18 = function(s) { return s },
      peg$c19 = "(",
      peg$c20 = peg$literalExpectation("(", false),
      peg$c21 = ")",
      peg$c22 = peg$literalExpectation(")", false),
      peg$c23 = function(expr) { return expr },
      peg$c24 = "*",
      peg$c25 = peg$literalExpectation("*", false),
      peg$c26 = function(fieldComparator, v) {
            return makeCompareAny(fieldComparator, false, v)
          },
      peg$c27 = "**",
      peg$c28 = peg$literalExpectation("**", false),
      peg$c29 = function(fieldComparator, v) {
            return makeCompareAny(fieldComparator, true, v)
          },
      peg$c30 = function(f, fieldComparator, v) {
            return makeCompareField(fieldComparator, f, v)
          },
      peg$c31 = function(v) {
            return makeCompareAny("in", false, v)
          },
      peg$c32 = function(v, f) {
            return makeCompareField("in", f, v)
          },
      peg$c33 = function(v) {
            return makeSearch(text(), v, false)
          },
      peg$c34 = function(v) {
            return makeSearch(text(), makeLiteral("string", v), true)
          },
      peg$c35 = function(i) { return i },
      peg$c36 = function(v) { return v },
      peg$c37 = function(v) {
            return makeLiteral("string", v)
          },
      peg$c38 = function(v) {
            return makeLiteral("regexp", v)
          },
      peg$c39 = function(v) {
            return makeLiteral("port", v)
          },
      peg$c40 = function(v) {
            return makeLiteral("net", v)
          },
      peg$c41 = function(v) {
            return makeLiteral("ip", v)
          },
      peg$c42 = function(v) {
            return makeLiteral("float64", v)
          },
      peg$c43 = function(v) {
            return makeLiteral("int64", v)
          },
      peg$c44 = "true",
      peg$c45 = peg$literalExpectation("true", false),
      peg$c46 = function() { return makeLiteral("bool", "true") },
      peg$c47 = "false",
      peg$c48 = peg$literalExpectation("false", false),
      peg$c49 = function() { return makeLiteral("bool", "false") },
      peg$c50 = "null",
      peg$c51 = peg$literalExpectation("null", false),
      peg$c52 = function() { return makeLiteral("null", "") },
      peg$c53 = function(first, rest) {
            let fp =  makeSequentialProc(first);
            if (rest) {
              return makeParallelProc([fp, ... rest])
            } else {
              return fp
            }
          },
      peg$c54 = ";",
      peg$c55 = peg$literalExpectation(";", false),
      peg$c56 = function(ch) { return makeSequentialProc(ch) },
      peg$c57 = function(proc) {
            return proc
          },
      peg$c58 = "by",
      peg$c59 = peg$literalExpectation("by", true),
      peg$c60 = ",",
      peg$c61 = peg$literalExpectation(",", false),
      peg$c62 = function(first, cl) { return cl },
      peg$c63 = function(first, rest) {
            return makeGroupByKeys(first, rest)
          },
      peg$c64 = function(field) { return makeGroupByKey(text(), field) },
      peg$c65 = "every",
      peg$c66 = peg$literalExpectation("every", true),
      peg$c67 = function(dur) { return dur },
      peg$c68 = "and",
      peg$c69 = peg$literalExpectation("and", true),
      peg$c70 = function() { return text() },
      peg$c71 = "or",
      peg$c72 = peg$literalExpectation("or", true),
      peg$c73 = "in",
      peg$c74 = peg$literalExpectation("in", true),
      peg$c75 = "not",
      peg$c76 = peg$literalExpectation("not", true),
      peg$c77 = /^[A-Za-z_$]/,
      peg$c78 = peg$classExpectation([["A", "Z"], ["a", "z"], "_", "$"], false, false),
      peg$c79 = /^[0-9]/,
      peg$c80 = peg$classExpectation([["0", "9"]], false, false),
      peg$c81 = ".",
      peg$c82 = peg$literalExpectation(".", false),
      peg$c83 = function(base, field) { return makeFieldCall("RecordFieldRead", null, field) },
      peg$c84 = "[",
      peg$c85 = peg$literalExpectation("[", false),
      peg$c86 = "]",
      peg$c87 = peg$literalExpectation("]", false),
      peg$c88 = function(base, index) { return makeFieldCall("Index", null, index) },
      peg$c89 = function(base, derefs) {
           return chainFieldCalls(base, derefs)
         },
      peg$c90 = function(op, field) {
            return makeFieldCall(op, field, null)
          },
      peg$c91 = "len",
      peg$c92 = peg$literalExpectation("len", true),
      peg$c93 = function() { return "Len" },
      peg$c94 = function(first, rest) {
            let result =  [first];

            for(let  r of rest) {
              result.push( r[3]);
            }

            return result
        },
      peg$c95 = function(base, refs) { return text() },
      peg$c96 = "count",
      peg$c97 = peg$literalExpectation("count", true),
      peg$c98 = function() { return "Count" },
      peg$c99 = "sum",
      peg$c100 = peg$literalExpectation("sum", true),
      peg$c101 = function() { return "Sum" },
      peg$c102 = "avg",
      peg$c103 = peg$literalExpectation("avg", true),
      peg$c104 = function() { return "Avg" },
      peg$c105 = "stdev",
      peg$c106 = peg$literalExpectation("stdev", true),
      peg$c107 = function() { return "Stdev" },
      peg$c108 = "sd",
      peg$c109 = peg$literalExpectation("sd", true),
      peg$c110 = "var",
      peg$c111 = peg$literalExpectation("var", true),
      peg$c112 = function() { return "Var" },
      peg$c113 = "entropy",
      peg$c114 = peg$literalExpectation("entropy", true),
      peg$c115 = function() { return "Entropy" },
      peg$c116 = "min",
      peg$c117 = peg$literalExpectation("min", true),
      peg$c118 = function() { return "Min" },
      peg$c119 = "max",
      peg$c120 = peg$literalExpectation("max", true),
      peg$c121 = function() { return "Max" },
      peg$c122 = "first",
      peg$c123 = peg$literalExpectation("first", true),
      peg$c124 = function() { return "First" },
      peg$c125 = "last",
      peg$c126 = peg$literalExpectation("last", true),
      peg$c127 = function() { return "Last" },
      peg$c128 = "countdistinct",
      peg$c129 = peg$literalExpectation("countdistinct", true),
      peg$c130 = function() { return "CountDistinct" },
      peg$c131 = function(field) { return field },
      peg$c132 = function(op, field) {
          return makeReducer(op, "count", field)
        },
      peg$c133 = function(op, field) {
          return makeReducer(op, toLowerCase(op), field)
        },
      peg$c134 = function(every, reducers, keys, limit) {
          if (OR(keys, every)) {
            if (keys) {
              keys = keys[1];
            } else {
              keys = [];
            }

            if (every) {
              every = every[0];
            }

            return makeGroupByProc(every, limit, keys, reducers)
          }

          return makeReduceProc(reducers)
        },
      peg$c135 = "=",
      peg$c136 = peg$literalExpectation("=", false),
      peg$c137 = function(field, f) {
          return overrideReducerVar(f, field)
        },
      peg$c138 = function(first, rest) {
            let result =  [first];
            for(let  r of rest) {
              result.push( r[3]);
            }
            return result
          },
      peg$c139 = "sort",
      peg$c140 = peg$literalExpectation("sort", true),
      peg$c141 = function(args, l) { return l },
      peg$c142 = function(args, list) {
          return makeSortProc(args, list)
        },
      peg$c143 = function(a) { return a },
      peg$c144 = "-r",
      peg$c145 = peg$literalExpectation("-r", false),
      peg$c146 = function() { return makeArg("r", null) },
      peg$c147 = "-nulls",
      peg$c148 = peg$literalExpectation("-nulls", false),
      peg$c149 = peg$literalExpectation("first", false),
      peg$c150 = peg$literalExpectation("last", false),
      peg$c151 = function(where) { return makeArg("nulls", where) },
      peg$c152 = "top",
      peg$c153 = peg$literalExpectation("top", true),
      peg$c154 = function(n) { return n},
      peg$c155 = "-flush",
      peg$c156 = peg$literalExpectation("-flush", false),
      peg$c157 = function(limit, flush, f) { return f },
      peg$c158 = function(limit, flush, list) {
          return makeTopProc(list, limit, flush)
        },
      peg$c159 = "-limit",
      peg$c160 = peg$literalExpectation("-limit", false),
      peg$c161 = function(limit) { return limit },
      peg$c162 = "-c",
      peg$c163 = peg$literalExpectation("-c", false),
      peg$c164 = function() { return makeArg("c", null) },
      peg$c165 = function(field) {
          return makeFieldAssignment("", field)
        },
      peg$c166 = "cut",
      peg$c167 = peg$literalExpectation("cut", true),
      peg$c168 = function(arg, first, cl) { return cl },
      peg$c169 = function(arg, first, rest) {  return makeCutProc(arg, first, rest) },
      peg$c170 = "head",
      peg$c171 = peg$literalExpectation("head", true),
      peg$c172 = function(count) { return makeHeadProc(count) },
      peg$c173 = function() { return makeHeadProc(1) },
      peg$c174 = "tail",
      peg$c175 = peg$literalExpectation("tail", true),
      peg$c176 = function(count) { return makeTailProc(count) },
      peg$c177 = function() { return makeTailProc(1) },
      peg$c178 = "filter",
      peg$c179 = peg$literalExpectation("filter", true),
      peg$c180 = "uniq",
      peg$c181 = peg$literalExpectation("uniq", true),
      peg$c182 = function() {
            return makeUniqProc(true)
          },
      peg$c183 = function() {
            return makeUniqProc(false)
          },
      peg$c184 = "put",
      peg$c185 = peg$literalExpectation("put", true),
      peg$c186 = function(first, rest) {
            return makePutProc(first, rest)
          },
      peg$c187 = "rename",
      peg$c188 = peg$literalExpectation("rename", true),
      peg$c189 = function(first, rest) {  return makeRenameProc(first, rest) },
      peg$c190 = function(f, e) {
            return makeExpressionAssignment(f, e)
          },
      peg$c191 = function(l, r) {
            return makeFieldAssignment(l, r)
          },
      peg$c192 = function(f) {
            return chainFieldCalls(f, [])
          },
      peg$c193 = "?",
      peg$c194 = peg$literalExpectation("?", false),
      peg$c195 = ":",
      peg$c196 = peg$literalExpectation(":", false),
      peg$c197 = function(condition, thenClause, elseClause) {
          return makeConditionalExpr(condition, thenClause, elseClause)
        },
      peg$c198 = function(first, rest) {
              return makeBinaryExprChain(first, rest)
          },
      peg$c199 = "=~",
      peg$c200 = peg$literalExpectation("=~", false),
      peg$c201 = "!~",
      peg$c202 = peg$literalExpectation("!~", false),
      peg$c203 = "!=",
      peg$c204 = peg$literalExpectation("!=", false),
      peg$c205 = peg$literalExpectation("in", false),
      peg$c206 = "<=",
      peg$c207 = peg$literalExpectation("<=", false),
      peg$c208 = "<",
      peg$c209 = peg$literalExpectation("<", false),
      peg$c210 = ">=",
      peg$c211 = peg$literalExpectation(">=", false),
      peg$c212 = ">",
      peg$c213 = peg$literalExpectation(">", false),
      peg$c214 = "+",
      peg$c215 = peg$literalExpectation("+", false),
      peg$c216 = "/",
      peg$c217 = peg$literalExpectation("/", false),
      peg$c218 = function(e) {
              return makeUnaryExpr("!", e)
          },
      peg$c219 = function(e, ct) { return ct },
      peg$c220 = function(e, t) {
          if (t) {
            return makeCastExpression(e, t)
          } else {
            return e
          }
        },
      peg$c221 = "bool",
      peg$c222 = peg$literalExpectation("bool", false),
      peg$c223 = "byte",
      peg$c224 = peg$literalExpectation("byte", false),
      peg$c225 = "int16",
      peg$c226 = peg$literalExpectation("int16", false),
      peg$c227 = "uint16",
      peg$c228 = peg$literalExpectation("uint16", false),
      peg$c229 = "int32",
      peg$c230 = peg$literalExpectation("int32", false),
      peg$c231 = "uint32",
      peg$c232 = peg$literalExpectation("uint32", false),
      peg$c233 = "int64",
      peg$c234 = peg$literalExpectation("int64", false),
      peg$c235 = "uint64",
      peg$c236 = peg$literalExpectation("uint64", false),
      peg$c237 = "float64",
      peg$c238 = peg$literalExpectation("float64", false),
      peg$c239 = "string",
      peg$c240 = peg$literalExpectation("string", false),
      peg$c241 = "bstring",
      peg$c242 = peg$literalExpectation("bstring", false),
      peg$c243 = "ip",
      peg$c244 = peg$literalExpectation("ip", false),
      peg$c245 = "net",
      peg$c246 = peg$literalExpectation("net", false),
      peg$c247 = "time",
      peg$c248 = peg$literalExpectation("time", false),
      peg$c249 = "duration",
      peg$c250 = peg$literalExpectation("duration", false),
      peg$c251 = function(fn, args) {
              return makeFunctionCall(fn, args)
          },
      peg$c252 = /^[A-Za-z]/,
      peg$c253 = peg$classExpectation([["A", "Z"], ["a", "z"]], false, false),
      peg$c254 = /^[.0-9]/,
      peg$c255 = peg$classExpectation([".", ["0", "9"]], false, false),
      peg$c256 = function(first, e) { return e },
      peg$c257 = function(first, rest) {
            return [first, ... rest]
        },
      peg$c258 = function() { return [] },
      peg$c259 = function(base, field) { return makeLiteral("string", text()) },
      peg$c260 = function(base, derefs) {
              return makeBinaryExprChain(base, derefs)
          },
      peg$c261 = peg$literalExpectation("and", false),
      peg$c262 = "seconds",
      peg$c263 = peg$literalExpectation("seconds", false),
      peg$c264 = "second",
      peg$c265 = peg$literalExpectation("second", false),
      peg$c266 = "secs",
      peg$c267 = peg$literalExpectation("secs", false),
      peg$c268 = "sec",
      peg$c269 = peg$literalExpectation("sec", false),
      peg$c270 = "s",
      peg$c271 = peg$literalExpectation("s", false),
      peg$c272 = "minutes",
      peg$c273 = peg$literalExpectation("minutes", false),
      peg$c274 = "minute",
      peg$c275 = peg$literalExpectation("minute", false),
      peg$c276 = "mins",
      peg$c277 = peg$literalExpectation("mins", false),
      peg$c278 = peg$literalExpectation("min", false),
      peg$c279 = "m",
      peg$c280 = peg$literalExpectation("m", false),
      peg$c281 = "hours",
      peg$c282 = peg$literalExpectation("hours", false),
      peg$c283 = "hrs",
      peg$c284 = peg$literalExpectation("hrs", false),
      peg$c285 = "hr",
      peg$c286 = peg$literalExpectation("hr", false),
      peg$c287 = "h",
      peg$c288 = peg$literalExpectation("h", false),
      peg$c289 = "hour",
      peg$c290 = peg$literalExpectation("hour", false),
      peg$c291 = "days",
      peg$c292 = peg$literalExpectation("days", false),
      peg$c293 = "day",
      peg$c294 = peg$literalExpectation("day", false),
      peg$c295 = "d",
      peg$c296 = peg$literalExpectation("d", false),
      peg$c297 = "weeks",
      peg$c298 = peg$literalExpectation("weeks", false),
      peg$c299 = "week",
      peg$c300 = peg$literalExpectation("week", false),
      peg$c301 = "wks",
      peg$c302 = peg$literalExpectation("wks", false),
      peg$c303 = "wk",
      peg$c304 = peg$literalExpectation("wk", false),
      peg$c305 = "w",
      peg$c306 = peg$literalExpectation("w", false),
      peg$c307 = function() { return makeDuration(1) },
      peg$c308 = function(num) { return makeDuration(num) },
      peg$c309 = function() { return makeDuration(60) },
      peg$c310 = function(num) { return makeDuration(num*60) },
      peg$c311 = function() { return makeDuration(3600) },
      peg$c312 = function(num) { return makeDuration(num*3600) },
      peg$c313 = function() { return makeDuration(3600*24) },
      peg$c314 = function(num) { return makeDuration(num*3600*24) },
      peg$c315 = function(num) { return makeDuration(num*3600*24*7) },
      peg$c316 = function(a) { return text() },
      peg$c317 = function(a, b) {
            return joinChars(a) + b
          },
      peg$c318 = "::",
      peg$c319 = peg$literalExpectation("::", false),
      peg$c320 = function(a, b, d, e) {
            return a + joinChars(b) + "::" + joinChars(d) + e
          },
      peg$c321 = function(a, b) {
            return "::" + joinChars(a) + b
          },
      peg$c322 = function(a, b) {
            return a + joinChars(b) + "::"
          },
      peg$c323 = function() {
            return "::"
          },
      peg$c324 = function(v) { return ":" + v },
      peg$c325 = function(v) { return v + ":" },
      peg$c326 = function(a, m) {
            return a + "/" + m.toString();
          },
      peg$c327 = function(a, m) {
            return a + "/" + m;
          },
      peg$c328 = function(s) { return parseInt(s) },
      peg$c329 = /^[+\-]/,
      peg$c330 = peg$classExpectation(["+", "-"], false, false),
      peg$c332 = function() {
            return text()
          },
      peg$c333 = "0",
      peg$c334 = peg$literalExpectation("0", false),
      peg$c335 = /^[1-9]/,
      peg$c336 = peg$classExpectation([["1", "9"]], false, false),
      peg$c337 = "e",
      peg$c338 = peg$literalExpectation("e", true),
      peg$c339 = function(chars) { return text() },
      peg$c340 = /^[0-9a-fA-F]/,
      peg$c341 = peg$classExpectation([["0", "9"], ["a", "f"], ["A", "F"]], false, false),
      peg$c342 = function(chars) { return joinChars(chars) },
      peg$c343 = "\\",
      peg$c344 = peg$literalExpectation("\\", false),
      peg$c345 = /^[\0-\x1F\\(),!><="|';]/,
      peg$c346 = peg$classExpectation([["\0", "\x1F"], "\\", "(", ")", ",", "!", ">", "<", "=", "\"", "|", "'", ";"], false, false),
      peg$c347 = peg$anyExpectation(),
      peg$c348 = "\"",
      peg$c349 = peg$literalExpectation("\"", false),
      peg$c350 = function(v) { return joinChars(v) },
      peg$c351 = "'",
      peg$c352 = peg$literalExpectation("'", false),
      peg$c353 = "x",
      peg$c354 = peg$literalExpectation("x", false),
      peg$c355 = function() { return "\\" + text() },
      peg$c356 = "b",
      peg$c357 = peg$literalExpectation("b", false),
      peg$c358 = function() { return "\b" },
      peg$c359 = "f",
      peg$c360 = peg$literalExpectation("f", false),
      peg$c361 = function() { return "\f" },
      peg$c362 = "n",
      peg$c363 = peg$literalExpectation("n", false),
      peg$c364 = function() { return "\n" },
      peg$c365 = "r",
      peg$c366 = peg$literalExpectation("r", false),
      peg$c367 = function() { return "\r" },
      peg$c368 = "t",
      peg$c369 = peg$literalExpectation("t", false),
      peg$c370 = function() { return "\t" },
      peg$c371 = "v",
      peg$c372 = peg$literalExpectation("v", false),
      peg$c373 = function() { return "\v" },
      peg$c374 = function() { return "=" },
      peg$c375 = function() { return "\\*" },
      peg$c376 = "u",
      peg$c377 = peg$literalExpectation("u", false),
      peg$c378 = function(chars) {
            return makeUnicodeChar(chars)
          },
      peg$c379 = "{",
      peg$c380 = peg$literalExpectation("{", false),
      peg$c381 = "}",
      peg$c382 = peg$literalExpectation("}", false),
      peg$c383 = /^[^\/\\]/,
      peg$c384 = peg$classExpectation(["/", "\\"], true, false),
      peg$c385 = "\\/",
      peg$c386 = peg$literalExpectation("\\/", false),
      peg$c387 = /^[\0-\x1F\\]/,
      peg$c388 = peg$classExpectation([["\0", "\x1F"], "\\"], false, false),
      peg$c389 = "\t",
      peg$c390 = peg$literalExpectation("\t", false),
      peg$c391 = "\x0B",
      peg$c392 = peg$literalExpectation("\x0B", false),
      peg$c393 = "\f",
      peg$c394 = peg$literalExpectation("\f", false),
      peg$c395 = " ",
      peg$c396 = peg$literalExpectation(" ", false),
      peg$c397 = "\xA0",
      peg$c398 = peg$literalExpectation("\xA0", false),
      peg$c399 = "\uFEFF",
      peg$c400 = peg$literalExpectation("\uFEFF", false),
      peg$c401 = peg$otherExpectation("whitespace"),

      peg$currPos          = 0,
      peg$savedPos         = 0,
      peg$posDetailsCache  = [{ line: 1, column: 1 }],
      peg$maxFailPos       = 0,
      peg$maxFailExpected  = [],
      peg$silentFails      = 0,

      peg$result;

  if ("startRule" in options) {
    if (!(options.startRule in peg$startRuleFunctions)) {
      throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
    }

    peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
  }

  function text() {
    return input.substring(peg$savedPos, peg$currPos);
  }

  function peg$literalExpectation(text, ignoreCase) {
    return { type: "literal", text: text, ignoreCase: ignoreCase };
  }

  function peg$classExpectation(parts, inverted, ignoreCase) {
    return { type: "class", parts: parts, inverted: inverted, ignoreCase: ignoreCase };
  }

  function peg$anyExpectation() {
    return { type: "any" };
  }

  function peg$endExpectation() {
    return { type: "end" };
  }

  function peg$otherExpectation(description) {
    return { type: "other", description: description };
  }

  function peg$computePosDetails(pos) {
    var details = peg$posDetailsCache[pos], p;

    if (details) {
      return details;
    } else {
      p = pos - 1;
      while (!peg$posDetailsCache[p]) {
        p--;
      }

      details = peg$posDetailsCache[p];
      details = {
        line:   details.line,
        column: details.column
      };

      while (p < pos) {
        if (input.charCodeAt(p) === 10) {
          details.line++;
          details.column = 1;
        } else {
          details.column++;
        }

        p++;
      }

      peg$posDetailsCache[pos] = details;
      return details;
    }
  }

  function peg$computeLocation(startPos, endPos) {
    var startPosDetails = peg$computePosDetails(startPos),
        endPosDetails   = peg$computePosDetails(endPos);

    return {
      start: {
        offset: startPos,
        line:   startPosDetails.line,
        column: startPosDetails.column
      },
      end: {
        offset: endPos,
        line:   endPosDetails.line,
        column: endPosDetails.column
      }
    };
  }

  function peg$fail(expected) {
    if (peg$currPos < peg$maxFailPos) { return; }

    if (peg$currPos > peg$maxFailPos) {
      peg$maxFailPos = peg$currPos;
      peg$maxFailExpected = [];
    }

    peg$maxFailExpected.push(expected);
  }

  function peg$buildStructuredError(expected, found, location) {
    return new peg$SyntaxError(
      peg$SyntaxError.buildMessage(expected, found),
      expected,
      found,
      location
    );
  }

  function peg$parsestart() {
    var s0, s1, s2, s3, s4;

    s0 = peg$currPos;
    s1 = peg$parse_();
    if (s1 === peg$FAILED) {
      s1 = null;
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsequery();
      if (s2 !== peg$FAILED) {
        s3 = peg$parse_();
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$parseEOF();
          if (s4 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c0(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsequery() {
    var s0, s1, s2, s3, s4;

    s0 = peg$currPos;
    s1 = peg$parseprocChain();
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c1(s1);
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parsesearch();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 === peg$FAILED) {
          s2 = null;
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parsechainedProc();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parsechainedProc();
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c2(s1, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parsesearch();
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c3(s1);
        }
        s0 = s1;
      }
    }

    return s0;
  }

  function peg$parseprocChain() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parseproc();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$parsechainedProc();
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$parsechainedProc();
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c4(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsechainedProc() {
    var s0, s1, s2, s3, s4;

    s0 = peg$currPos;
    s1 = peg$parse_();
    if (s1 === peg$FAILED) {
      s1 = null;
    }
    if (s1 !== peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 124) {
        s2 = peg$c5;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c6); }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parse_();
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$parseproc();
          if (s4 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c7(s4);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsesearch() {
    var s0, s1;

    s0 = peg$currPos;
    s1 = peg$parsesearchExpr();
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c8(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parsesearchExpr() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parsesearchTerm();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$parseoredSearchTerm();
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$parseoredSearchTerm();
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c9(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseoredSearchTerm() {
    var s0, s1, s2, s3, s4;

    s0 = peg$currPos;
    s1 = peg$parse_();
    if (s1 !== peg$FAILED) {
      s2 = peg$parseorToken();
      if (s2 !== peg$FAILED) {
        s3 = peg$parse_();
        if (s3 !== peg$FAILED) {
          s4 = peg$parsesearchTerm();
          if (s4 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c10(s4);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsesearchTerm() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parsesearchFactor();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$parseandedSearchTerm();
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$parseandedSearchTerm();
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c11(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseandedSearchTerm() {
    var s0, s1, s2, s3, s4;

    s0 = peg$currPos;
    s1 = peg$parse_();
    if (s1 !== peg$FAILED) {
      s2 = peg$currPos;
      s3 = peg$parseandToken();
      if (s3 !== peg$FAILED) {
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          s3 = [s3, s4];
          s2 = s3;
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parsesearchFactor();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c12(s3);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsesearchFactor() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$currPos;
    s1 = peg$currPos;
    s2 = peg$parsenotToken();
    if (s2 !== peg$FAILED) {
      s3 = peg$parse_();
      if (s3 !== peg$FAILED) {
        s2 = [s2, s3];
        s1 = s2;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 === peg$FAILED) {
      s1 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 33) {
        s2 = peg$c13;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c14); }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parse_();
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsesearchExpr();
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c15(s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$currPos;
      peg$silentFails++;
      if (input.charCodeAt(peg$currPos) === 45) {
        s2 = peg$c16;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c17); }
      }
      peg$silentFails--;
      if (s2 === peg$FAILED) {
        s1 = void 0;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parsesearchPred();
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c18(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 40) {
          s1 = peg$c19;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c20); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_();
          if (s2 === peg$FAILED) {
            s2 = null;
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parsesearchExpr();
            if (s3 !== peg$FAILED) {
              s4 = peg$parse_();
              if (s4 === peg$FAILED) {
                s4 = null;
              }
              if (s4 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 41) {
                  s5 = peg$c21;
                  peg$currPos++;
                } else {
                  s5 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c22); }
                }
                if (s5 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c23(s3);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      }
    }

    return s0;
  }

  function peg$parsesearchPred() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 42) {
      s1 = peg$c24;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c25); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parseequalityToken();
        if (s3 !== peg$FAILED) {
          s4 = peg$parse_();
          if (s4 === peg$FAILED) {
            s4 = null;
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parsesearchValue();
            if (s5 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c26(s3, s5);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2) === peg$c27) {
        s1 = peg$c27;
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c28); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 === peg$FAILED) {
          s2 = null;
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseequalityToken();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 === peg$FAILED) {
              s4 = null;
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parsesearchValue();
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c29(s3, s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parsefieldExpr();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_();
          if (s2 === peg$FAILED) {
            s2 = null;
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parseequalityToken();
            if (s3 !== peg$FAILED) {
              s4 = peg$parse_();
              if (s4 === peg$FAILED) {
                s4 = null;
              }
              if (s4 !== peg$FAILED) {
                s5 = peg$parsesearchValue();
                if (s5 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c30(s1, s3, s5);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parsesearchValue();
          if (s1 !== peg$FAILED) {
            s2 = peg$parse_();
            if (s2 === peg$FAILED) {
              s2 = null;
            }
            if (s2 !== peg$FAILED) {
              s3 = peg$parseinToken();
              if (s3 !== peg$FAILED) {
                s4 = peg$parse_();
                if (s4 === peg$FAILED) {
                  s4 = null;
                }
                if (s4 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 42) {
                    s5 = peg$c24;
                    peg$currPos++;
                  } else {
                    s5 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c25); }
                  }
                  if (s5 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c31(s1);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parsesearchValue();
            if (s1 !== peg$FAILED) {
              s2 = peg$parse_();
              if (s2 === peg$FAILED) {
                s2 = null;
              }
              if (s2 !== peg$FAILED) {
                s3 = peg$parseinToken();
                if (s3 !== peg$FAILED) {
                  s4 = peg$parse_();
                  if (s4 === peg$FAILED) {
                    s4 = null;
                  }
                  if (s4 !== peg$FAILED) {
                    s5 = peg$parsefieldReference();
                    if (s5 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s1 = peg$c32(s1, s5);
                      s0 = s1;
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              s1 = peg$parsesearchLiteral();
              if (s1 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c33(s1);
              }
              s0 = s1;
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                s1 = peg$currPos;
                peg$silentFails++;
                s2 = peg$currPos;
                s3 = peg$parsesearchKeywords();
                if (s3 !== peg$FAILED) {
                  s4 = peg$parse_();
                  if (s4 !== peg$FAILED) {
                    s3 = [s3, s4];
                    s2 = s3;
                  } else {
                    peg$currPos = s2;
                    s2 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s2;
                  s2 = peg$FAILED;
                }
                peg$silentFails--;
                if (s2 === peg$FAILED) {
                  s1 = void 0;
                } else {
                  peg$currPos = s1;
                  s1 = peg$FAILED;
                }
                if (s1 !== peg$FAILED) {
                  s2 = peg$parsesearchWord();
                  if (s2 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c34(s2);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              }
            }
          }
        }
      }
    }

    return s0;
  }

  function peg$parsesearchLiteral() {
    var s0, s1, s2, s3, s4;

    s0 = peg$parseStringLiteral();
    if (s0 === peg$FAILED) {
      s0 = peg$parseRegexpLiteral();
      if (s0 === peg$FAILED) {
        s0 = peg$parsePortLiteral();
        if (s0 === peg$FAILED) {
          s0 = peg$parseSubnetLiteral();
          if (s0 === peg$FAILED) {
            s0 = peg$parseAddressLiteral();
            if (s0 === peg$FAILED) {
              s0 = peg$parseFloatLiteral();
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                s1 = peg$parseIntegerLiteral();
                if (s1 !== peg$FAILED) {
                  s2 = peg$currPos;
                  peg$silentFails++;
                  s3 = peg$parsesearchWord();
                  peg$silentFails--;
                  if (s3 === peg$FAILED) {
                    s2 = void 0;
                  } else {
                    peg$currPos = s2;
                    s2 = peg$FAILED;
                  }
                  if (s2 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c35(s1);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  s1 = peg$currPos;
                  peg$silentFails++;
                  s2 = peg$currPos;
                  s3 = peg$parsesearchKeywords();
                  if (s3 !== peg$FAILED) {
                    s4 = peg$parse_();
                    if (s4 !== peg$FAILED) {
                      s3 = [s3, s4];
                      s2 = s3;
                    } else {
                      peg$currPos = s2;
                      s2 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s2;
                    s2 = peg$FAILED;
                  }
                  peg$silentFails--;
                  if (s2 === peg$FAILED) {
                    s1 = void 0;
                  } else {
                    peg$currPos = s1;
                    s1 = peg$FAILED;
                  }
                  if (s1 !== peg$FAILED) {
                    s2 = peg$parseBooleanLiteral();
                    if (s2 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s1 = peg$c36(s2);
                      s0 = s1;
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                  if (s0 === peg$FAILED) {
                    s0 = peg$currPos;
                    s1 = peg$currPos;
                    peg$silentFails++;
                    s2 = peg$currPos;
                    s3 = peg$parsesearchKeywords();
                    if (s3 !== peg$FAILED) {
                      s4 = peg$parse_();
                      if (s4 !== peg$FAILED) {
                        s3 = [s3, s4];
                        s2 = s3;
                      } else {
                        peg$currPos = s2;
                        s2 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s2;
                      s2 = peg$FAILED;
                    }
                    peg$silentFails--;
                    if (s2 === peg$FAILED) {
                      s1 = void 0;
                    } else {
                      peg$currPos = s1;
                      s1 = peg$FAILED;
                    }
                    if (s1 !== peg$FAILED) {
                      s2 = peg$parseNullLiteral();
                      if (s2 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c36(s2);
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return s0;
  }

  function peg$parsesearchValue() {
    var s0, s1, s2, s3, s4;

    s0 = peg$parsesearchLiteral();
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$currPos;
      peg$silentFails++;
      s2 = peg$currPos;
      s3 = peg$parsesearchKeywords();
      if (s3 !== peg$FAILED) {
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          s3 = [s3, s4];
          s2 = s3;
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
      peg$silentFails--;
      if (s2 === peg$FAILED) {
        s1 = void 0;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parsesearchWord();
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c37(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }

    return s0;
  }

  function peg$parseStringLiteral() {
    var s0, s1;

    s0 = peg$currPos;
    s1 = peg$parsequotedString();
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c37(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parseRegexpLiteral() {
    var s0, s1;

    s0 = peg$currPos;
    s1 = peg$parsereString();
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c38(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parsePortLiteral() {
    var s0, s1;

    s0 = peg$currPos;
    s1 = peg$parseport();
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c39(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parseSubnetLiteral() {
    var s0, s1;

    s0 = peg$currPos;
    s1 = peg$parseip6subnet();
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c40(s1);
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parsesubnet();
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c40(s1);
      }
      s0 = s1;
    }

    return s0;
  }

  function peg$parseAddressLiteral() {
    var s0, s1;

    s0 = peg$currPos;
    s1 = peg$parseip6addr();
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c41(s1);
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parseaddr();
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c41(s1);
      }
      s0 = s1;
    }

    return s0;
  }

  function peg$parseFloatLiteral() {
    var s0, s1;

    s0 = peg$currPos;
    s1 = peg$parsesdouble();
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c42(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parseIntegerLiteral() {
    var s0, s1;

    s0 = peg$currPos;
    s1 = peg$parsesinteger();
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c43(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parseBooleanLiteral() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 4) === peg$c44) {
      s1 = peg$c44;
      peg$currPos += 4;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c45); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c46();
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 5) === peg$c47) {
        s1 = peg$c47;
        peg$currPos += 5;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c48); }
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c49();
      }
      s0 = s1;
    }

    return s0;
  }

  function peg$parseNullLiteral() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 4) === peg$c50) {
      s1 = peg$c50;
      peg$currPos += 4;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c51); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c52();
    }
    s0 = s1;

    return s0;
  }

  function peg$parsesearchKeywords() {
    var s0;

    s0 = peg$parseandToken();
    if (s0 === peg$FAILED) {
      s0 = peg$parseorToken();
      if (s0 === peg$FAILED) {
        s0 = peg$parseinToken();
      }
    }

    return s0;
  }

  function peg$parseprocList() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parseprocChain();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$parseparallelChain();
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$parseparallelChain();
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c53(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseparallelChain() {
    var s0, s1, s2, s3, s4;

    s0 = peg$currPos;
    s1 = peg$parse_();
    if (s1 === peg$FAILED) {
      s1 = null;
    }
    if (s1 !== peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 59) {
        s2 = peg$c54;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c55); }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parse_();
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$parseprocChain();
          if (s4 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c56(s4);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseproc() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$parsesimpleProc();
    if (s0 === peg$FAILED) {
      s0 = peg$parsereduceProc();
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 40) {
          s1 = peg$c19;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c20); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_();
          if (s2 === peg$FAILED) {
            s2 = null;
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parseprocList();
            if (s3 !== peg$FAILED) {
              s4 = peg$parse_();
              if (s4 === peg$FAILED) {
                s4 = null;
              }
              if (s4 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 41) {
                  s5 = peg$c21;
                  peg$currPos++;
                } else {
                  s5 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c22); }
                }
                if (s5 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c57(s3);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      }
    }

    return s0;
  }

  function peg$parsegroupByKeys() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 2).toLowerCase() === peg$c58) {
      s1 = input.substr(peg$currPos, 2);
      peg$currPos += 2;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c59); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 !== peg$FAILED) {
        s3 = peg$parsegroupByKey();
        if (s3 !== peg$FAILED) {
          s4 = [];
          s5 = peg$currPos;
          s6 = peg$parse__();
          if (s6 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 44) {
              s7 = peg$c60;
              peg$currPos++;
            } else {
              s7 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c61); }
            }
            if (s7 !== peg$FAILED) {
              s8 = peg$parse__();
              if (s8 !== peg$FAILED) {
                s9 = peg$parsegroupByKey();
                if (s9 !== peg$FAILED) {
                  peg$savedPos = s5;
                  s6 = peg$c62(s3, s9);
                  s5 = s6;
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            s5 = peg$currPos;
            s6 = peg$parse__();
            if (s6 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 44) {
                s7 = peg$c60;
                peg$currPos++;
              } else {
                s7 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c61); }
              }
              if (s7 !== peg$FAILED) {
                s8 = peg$parse__();
                if (s8 !== peg$FAILED) {
                  s9 = peg$parsegroupByKey();
                  if (s9 !== peg$FAILED) {
                    peg$savedPos = s5;
                    s6 = peg$c62(s3, s9);
                    s5 = s6;
                  } else {
                    peg$currPos = s5;
                    s5 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
          }
          if (s4 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c63(s3, s4);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsegroupByKey() {
    var s0, s1;

    s0 = peg$parseExpressionAssignment();
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parsefieldExpr();
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c64(s1);
      }
      s0 = s1;
    }

    return s0;
  }

  function peg$parseeveryDur() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 5).toLowerCase() === peg$c65) {
      s1 = input.substr(peg$currPos, 5);
      peg$currPos += 5;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c66); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseduration();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c67(s3);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseequalityToken() {
    var s0;

    s0 = peg$parseEqualityOperator();
    if (s0 === peg$FAILED) {
      s0 = peg$parseRelativeOperator();
    }

    return s0;
  }

  function peg$parseandToken() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 3).toLowerCase() === peg$c68) {
      s1 = input.substr(peg$currPos, 3);
      peg$currPos += 3;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c69); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c70();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseorToken() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 2).toLowerCase() === peg$c71) {
      s1 = input.substr(peg$currPos, 2);
      peg$currPos += 2;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c72); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c70();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseinToken() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 2).toLowerCase() === peg$c73) {
      s1 = input.substr(peg$currPos, 2);
      peg$currPos += 2;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c74); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c70();
    }
    s0 = s1;

    return s0;
  }

  function peg$parsenotToken() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 3).toLowerCase() === peg$c75) {
      s1 = input.substr(peg$currPos, 3);
      peg$currPos += 3;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c76); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c70();
    }
    s0 = s1;

    return s0;
  }

  function peg$parsefieldName() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parsefieldNameStart();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$parsefieldNameRest();
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$parsefieldNameRest();
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c70();
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsefieldNameStart() {
    var s0;

    if (peg$c77.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c78); }
    }

    return s0;
  }

  function peg$parsefieldNameRest() {
    var s0;

    s0 = peg$parsefieldNameStart();
    if (s0 === peg$FAILED) {
      if (peg$c79.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c80); }
      }
    }

    return s0;
  }

  function peg$parsefieldReference() {
    var s0, s1, s2, s3, s4, s5, s6;

    s0 = peg$currPos;
    s1 = peg$parsefieldName();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 46) {
        s4 = peg$c81;
        peg$currPos++;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c82); }
      }
      if (s4 !== peg$FAILED) {
        s5 = peg$parsefieldName();
        if (s5 !== peg$FAILED) {
          peg$savedPos = s3;
          s4 = peg$c83(s1, s5);
          s3 = s4;
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      if (s3 === peg$FAILED) {
        s3 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 91) {
          s4 = peg$c84;
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c85); }
        }
        if (s4 !== peg$FAILED) {
          s5 = peg$parsesuint();
          if (s5 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 93) {
              s6 = peg$c86;
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c87); }
            }
            if (s6 !== peg$FAILED) {
              peg$savedPos = s3;
              s4 = peg$c88(s1, s5);
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 46) {
          s4 = peg$c81;
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c82); }
        }
        if (s4 !== peg$FAILED) {
          s5 = peg$parsefieldName();
          if (s5 !== peg$FAILED) {
            peg$savedPos = s3;
            s4 = peg$c83(s1, s5);
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        if (s3 === peg$FAILED) {
          s3 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 91) {
            s4 = peg$c84;
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c85); }
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parsesuint();
            if (s5 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 93) {
                s6 = peg$c86;
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c87); }
              }
              if (s6 !== peg$FAILED) {
                peg$savedPos = s3;
                s4 = peg$c88(s1, s5);
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c89(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsefieldExpr() {
    var s0, s1, s2, s3, s4, s5, s6, s7;

    s0 = peg$currPos;
    s1 = peg$parsefieldOp();
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      if (s2 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 40) {
          s3 = peg$c19;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c20); }
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$parse_();
          if (s4 === peg$FAILED) {
            s4 = null;
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parsefieldReference();
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_();
              if (s6 === peg$FAILED) {
                s6 = null;
              }
              if (s6 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 41) {
                  s7 = peg$c21;
                  peg$currPos++;
                } else {
                  s7 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c22); }
                }
                if (s7 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c90(s1, s5);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$parsefieldReference();
    }

    return s0;
  }

  function peg$parsefieldOp() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 3).toLowerCase() === peg$c91) {
      s1 = input.substr(peg$currPos, 3);
      peg$currPos += 3;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c92); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c93();
    }
    s0 = s1;

    return s0;
  }

  function peg$parsefieldExprList() {
    var s0, s1, s2, s3, s4, s5, s6, s7;

    s0 = peg$currPos;
    s1 = peg$parsefieldExpr();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$parse_();
      if (s4 === peg$FAILED) {
        s4 = null;
      }
      if (s4 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 44) {
          s5 = peg$c60;
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c61); }
        }
        if (s5 !== peg$FAILED) {
          s6 = peg$parse_();
          if (s6 === peg$FAILED) {
            s6 = null;
          }
          if (s6 !== peg$FAILED) {
            s7 = peg$parsefieldExpr();
            if (s7 !== peg$FAILED) {
              s4 = [s4, s5, s6, s7];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (s4 === peg$FAILED) {
          s4 = null;
        }
        if (s4 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 44) {
            s5 = peg$c60;
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c61); }
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            if (s6 === peg$FAILED) {
              s6 = null;
            }
            if (s6 !== peg$FAILED) {
              s7 = peg$parsefieldExpr();
              if (s7 !== peg$FAILED) {
                s4 = [s4, s5, s6, s7];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c94(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsefieldRefDotOnly() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$currPos;
    s1 = peg$parsefieldName();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 46) {
        s4 = peg$c81;
        peg$currPos++;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c82); }
      }
      if (s4 !== peg$FAILED) {
        s5 = peg$parsefieldName();
        if (s5 !== peg$FAILED) {
          s4 = [s4, s5];
          s3 = s4;
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 46) {
          s4 = peg$c81;
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c82); }
        }
        if (s4 !== peg$FAILED) {
          s5 = peg$parsefieldName();
          if (s5 !== peg$FAILED) {
            s4 = [s4, s5];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c95();
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsecountOp() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 5).toLowerCase() === peg$c96) {
      s1 = input.substr(peg$currPos, 5);
      peg$currPos += 5;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c97); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c98();
    }
    s0 = s1;

    return s0;
  }

  function peg$parsefieldReducerOp() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 3).toLowerCase() === peg$c99) {
      s1 = input.substr(peg$currPos, 3);
      peg$currPos += 3;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c100); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c101();
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3).toLowerCase() === peg$c102) {
        s1 = input.substr(peg$currPos, 3);
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c103); }
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c104();
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 5).toLowerCase() === peg$c105) {
          s1 = input.substr(peg$currPos, 5);
          peg$currPos += 5;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c106); }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c107();
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.substr(peg$currPos, 2).toLowerCase() === peg$c108) {
            s1 = input.substr(peg$currPos, 2);
            peg$currPos += 2;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c109); }
          }
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c107();
          }
          s0 = s1;
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 3).toLowerCase() === peg$c110) {
              s1 = input.substr(peg$currPos, 3);
              peg$currPos += 3;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c111); }
            }
            if (s1 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c112();
            }
            s0 = s1;
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (input.substr(peg$currPos, 7).toLowerCase() === peg$c113) {
                s1 = input.substr(peg$currPos, 7);
                peg$currPos += 7;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c114); }
              }
              if (s1 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c115();
              }
              s0 = s1;
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (input.substr(peg$currPos, 3).toLowerCase() === peg$c116) {
                  s1 = input.substr(peg$currPos, 3);
                  peg$currPos += 3;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c117); }
                }
                if (s1 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c118();
                }
                s0 = s1;
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  if (input.substr(peg$currPos, 3).toLowerCase() === peg$c119) {
                    s1 = input.substr(peg$currPos, 3);
                    peg$currPos += 3;
                  } else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c120); }
                  }
                  if (s1 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c121();
                  }
                  s0 = s1;
                  if (s0 === peg$FAILED) {
                    s0 = peg$currPos;
                    if (input.substr(peg$currPos, 5).toLowerCase() === peg$c122) {
                      s1 = input.substr(peg$currPos, 5);
                      peg$currPos += 5;
                    } else {
                      s1 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c123); }
                    }
                    if (s1 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s1 = peg$c124();
                    }
                    s0 = s1;
                    if (s0 === peg$FAILED) {
                      s0 = peg$currPos;
                      if (input.substr(peg$currPos, 4).toLowerCase() === peg$c125) {
                        s1 = input.substr(peg$currPos, 4);
                        peg$currPos += 4;
                      } else {
                        s1 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c126); }
                      }
                      if (s1 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c127();
                      }
                      s0 = s1;
                      if (s0 === peg$FAILED) {
                        s0 = peg$currPos;
                        if (input.substr(peg$currPos, 13).toLowerCase() === peg$c128) {
                          s1 = input.substr(peg$currPos, 13);
                          peg$currPos += 13;
                        } else {
                          s1 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c129); }
                        }
                        if (s1 !== peg$FAILED) {
                          peg$savedPos = s0;
                          s1 = peg$c130();
                        }
                        s0 = s1;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return s0;
  }

  function peg$parsepaddedFieldExpr() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parse_();
    if (s1 === peg$FAILED) {
      s1 = null;
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsefieldExpr();
      if (s2 !== peg$FAILED) {
        s3 = peg$parse_();
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c131(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsecountReducer() {
    var s0, s1, s2, s3, s4, s5, s6;

    s0 = peg$currPos;
    s1 = peg$parsecountOp();
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      if (s2 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 40) {
          s3 = peg$c19;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c20); }
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$parsepaddedFieldExpr();
          if (s4 === peg$FAILED) {
            s4 = null;
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parse_();
            if (s5 === peg$FAILED) {
              s5 = null;
            }
            if (s5 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 41) {
                s6 = peg$c21;
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c22); }
              }
              if (s6 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c132(s1, s4);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsefieldReducer() {
    var s0, s1, s2, s3, s4, s5, s6, s7;

    s0 = peg$currPos;
    s1 = peg$parsefieldReducerOp();
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      if (s2 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 40) {
          s3 = peg$c19;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c20); }
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$parse_();
          if (s4 === peg$FAILED) {
            s4 = null;
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parsefieldExpr();
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_();
              if (s6 === peg$FAILED) {
                s6 = null;
              }
              if (s6 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 41) {
                  s7 = peg$c21;
                  peg$currPos++;
                } else {
                  s7 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c22); }
                }
                if (s7 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c133(s1, s5);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsereduceProc() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$currPos;
    s1 = peg$currPos;
    s2 = peg$parseeveryDur();
    if (s2 !== peg$FAILED) {
      s3 = peg$parse_();
      if (s3 !== peg$FAILED) {
        s2 = [s2, s3];
        s1 = s2;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 === peg$FAILED) {
      s1 = null;
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsereducerList();
      if (s2 !== peg$FAILED) {
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          s5 = peg$parsegroupByKeys();
          if (s5 !== peg$FAILED) {
            s4 = [s4, s5];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$parseprocLimitArg();
          if (s4 === peg$FAILED) {
            s4 = null;
          }
          if (s4 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c134(s1, s2, s3, s4);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsereducerExpr() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$currPos;
    s1 = peg$parsefieldName();
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      if (s2 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 61) {
          s3 = peg$c135;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c136); }
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$parse_();
          if (s4 === peg$FAILED) {
            s4 = null;
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parsereducer();
            if (s5 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c137(s1, s5);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$parsereducer();
    }

    return s0;
  }

  function peg$parsereducer() {
    var s0;

    s0 = peg$parsecountReducer();
    if (s0 === peg$FAILED) {
      s0 = peg$parsefieldReducer();
    }

    return s0;
  }

  function peg$parsereducerList() {
    var s0, s1, s2, s3, s4, s5, s6, s7;

    s0 = peg$currPos;
    s1 = peg$parsereducerExpr();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$parse_();
      if (s4 === peg$FAILED) {
        s4 = null;
      }
      if (s4 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 44) {
          s5 = peg$c60;
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c61); }
        }
        if (s5 !== peg$FAILED) {
          s6 = peg$parse_();
          if (s6 === peg$FAILED) {
            s6 = null;
          }
          if (s6 !== peg$FAILED) {
            s7 = peg$parsereducerExpr();
            if (s7 !== peg$FAILED) {
              s4 = [s4, s5, s6, s7];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (s4 === peg$FAILED) {
          s4 = null;
        }
        if (s4 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 44) {
            s5 = peg$c60;
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c61); }
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            if (s6 === peg$FAILED) {
              s6 = null;
            }
            if (s6 !== peg$FAILED) {
              s7 = peg$parsereducerExpr();
              if (s7 !== peg$FAILED) {
                s4 = [s4, s5, s6, s7];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c138(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsesimpleProc() {
    var s0;

    s0 = peg$parsesort();
    if (s0 === peg$FAILED) {
      s0 = peg$parsetop();
      if (s0 === peg$FAILED) {
        s0 = peg$parsecut();
        if (s0 === peg$FAILED) {
          s0 = peg$parsehead();
          if (s0 === peg$FAILED) {
            s0 = peg$parsetail();
            if (s0 === peg$FAILED) {
              s0 = peg$parsefilter();
              if (s0 === peg$FAILED) {
                s0 = peg$parseuniq();
                if (s0 === peg$FAILED) {
                  s0 = peg$parseput();
                  if (s0 === peg$FAILED) {
                    s0 = peg$parserename();
                  }
                }
              }
            }
          }
        }
      }
    }

    return s0;
  }

  function peg$parsesort() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 4).toLowerCase() === peg$c139) {
      s1 = input.substr(peg$currPos, 4);
      peg$currPos += 4;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c140); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsesortArgs();
      if (s2 !== peg$FAILED) {
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          s5 = peg$parsefieldExprList();
          if (s5 !== peg$FAILED) {
            peg$savedPos = s3;
            s4 = peg$c141(s2, s5);
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c142(s2, s3);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsesortArgs() {
    var s0, s1, s2, s3;

    s0 = [];
    s1 = peg$currPos;
    s2 = peg$parse_();
    if (s2 !== peg$FAILED) {
      s3 = peg$parsesortArg();
      if (s3 !== peg$FAILED) {
        peg$savedPos = s1;
        s2 = peg$c143(s3);
        s1 = s2;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    while (s1 !== peg$FAILED) {
      s0.push(s1);
      s1 = peg$currPos;
      s2 = peg$parse_();
      if (s2 !== peg$FAILED) {
        s3 = peg$parsesortArg();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s1;
          s2 = peg$c143(s3);
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    }

    return s0;
  }

  function peg$parsesortArg() {
    var s0, s1, s2, s3, s4;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 2) === peg$c144) {
      s1 = peg$c144;
      peg$currPos += 2;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c145); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c146();
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 6) === peg$c147) {
        s1 = peg$c147;
        peg$currPos += 6;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c148); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$currPos;
          if (input.substr(peg$currPos, 5) === peg$c122) {
            s4 = peg$c122;
            peg$currPos += 5;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c149); }
          }
          if (s4 === peg$FAILED) {
            if (input.substr(peg$currPos, 4) === peg$c125) {
              s4 = peg$c125;
              peg$currPos += 4;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c150); }
            }
          }
          if (s4 !== peg$FAILED) {
            peg$savedPos = s3;
            s4 = peg$c70();
          }
          s3 = s4;
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c151(s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }

    return s0;
  }

  function peg$parsetop() {
    var s0, s1, s2, s3, s4, s5, s6;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 3).toLowerCase() === peg$c152) {
      s1 = input.substr(peg$currPos, 3);
      peg$currPos += 3;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c153); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$currPos;
      s3 = peg$parse_();
      if (s3 !== peg$FAILED) {
        s4 = peg$parseunsignedInteger();
        if (s4 !== peg$FAILED) {
          peg$savedPos = s2;
          s3 = peg$c154(s4);
          s2 = s3;
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          if (input.substr(peg$currPos, 6) === peg$c155) {
            s5 = peg$c155;
            peg$currPos += 6;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c156); }
          }
          if (s5 !== peg$FAILED) {
            s4 = [s4, s5];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$currPos;
          s5 = peg$parse_();
          if (s5 !== peg$FAILED) {
            s6 = peg$parsefieldExprList();
            if (s6 !== peg$FAILED) {
              peg$savedPos = s4;
              s5 = peg$c157(s2, s3, s6);
              s4 = s5;
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          if (s4 === peg$FAILED) {
            s4 = null;
          }
          if (s4 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c158(s2, s3, s4);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseprocLimitArg() {
    var s0, s1, s2, s3, s4;

    s0 = peg$currPos;
    s1 = peg$parse_();
    if (s1 !== peg$FAILED) {
      if (input.substr(peg$currPos, 6) === peg$c159) {
        s2 = peg$c159;
        peg$currPos += 6;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c160); }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parse_();
        if (s3 !== peg$FAILED) {
          s4 = peg$parseunsignedInteger();
          if (s4 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c161(s4);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsecutArg() {
    var s0, s1, s2, s3;

    s0 = [];
    s1 = peg$currPos;
    s2 = peg$parse_();
    if (s2 !== peg$FAILED) {
      if (input.substr(peg$currPos, 2) === peg$c162) {
        s3 = peg$c162;
        peg$currPos += 2;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c163); }
      }
      if (s3 !== peg$FAILED) {
        peg$savedPos = s1;
        s2 = peg$c164();
        s1 = s2;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    while (s1 !== peg$FAILED) {
      s0.push(s1);
      s1 = peg$currPos;
      s2 = peg$parse_();
      if (s2 !== peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c162) {
          s3 = peg$c162;
          peg$currPos += 2;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c163); }
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s1;
          s2 = peg$c164();
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    }

    return s0;
  }

  function peg$parsecutAssignment() {
    var s0, s1;

    s0 = peg$parseFieldAssignment();
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parsefieldRefDotOnly();
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c165(s1);
      }
      s0 = s1;
    }

    return s0;
  }

  function peg$parsecut() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 3).toLowerCase() === peg$c166) {
      s1 = input.substr(peg$currPos, 3);
      peg$currPos += 3;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c167); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsecutArg();
      if (s2 !== peg$FAILED) {
        s3 = peg$parse_();
        if (s3 !== peg$FAILED) {
          s4 = peg$parsecutAssignment();
          if (s4 !== peg$FAILED) {
            s5 = [];
            s6 = peg$currPos;
            s7 = peg$parse__();
            if (s7 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 44) {
                s8 = peg$c60;
                peg$currPos++;
              } else {
                s8 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c61); }
              }
              if (s8 !== peg$FAILED) {
                s9 = peg$parse__();
                if (s9 !== peg$FAILED) {
                  s10 = peg$parsecutAssignment();
                  if (s10 !== peg$FAILED) {
                    peg$savedPos = s6;
                    s7 = peg$c168(s2, s4, s10);
                    s6 = s7;
                  } else {
                    peg$currPos = s6;
                    s6 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s6;
                  s6 = peg$FAILED;
                }
              } else {
                peg$currPos = s6;
                s6 = peg$FAILED;
              }
            } else {
              peg$currPos = s6;
              s6 = peg$FAILED;
            }
            while (s6 !== peg$FAILED) {
              s5.push(s6);
              s6 = peg$currPos;
              s7 = peg$parse__();
              if (s7 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 44) {
                  s8 = peg$c60;
                  peg$currPos++;
                } else {
                  s8 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c61); }
                }
                if (s8 !== peg$FAILED) {
                  s9 = peg$parse__();
                  if (s9 !== peg$FAILED) {
                    s10 = peg$parsecutAssignment();
                    if (s10 !== peg$FAILED) {
                      peg$savedPos = s6;
                      s7 = peg$c168(s2, s4, s10);
                      s6 = s7;
                    } else {
                      peg$currPos = s6;
                      s6 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s6;
                    s6 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s6;
                  s6 = peg$FAILED;
                }
              } else {
                peg$currPos = s6;
                s6 = peg$FAILED;
              }
            }
            if (s5 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c169(s2, s4, s5);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsehead() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 4).toLowerCase() === peg$c170) {
      s1 = input.substr(peg$currPos, 4);
      peg$currPos += 4;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c171); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseunsignedInteger();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c172(s3);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4).toLowerCase() === peg$c170) {
        s1 = input.substr(peg$currPos, 4);
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c171); }
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c173();
      }
      s0 = s1;
    }

    return s0;
  }

  function peg$parsetail() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 4).toLowerCase() === peg$c174) {
      s1 = input.substr(peg$currPos, 4);
      peg$currPos += 4;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c175); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseunsignedInteger();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c176(s3);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4).toLowerCase() === peg$c174) {
        s1 = input.substr(peg$currPos, 4);
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c175); }
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c177();
      }
      s0 = s1;
    }

    return s0;
  }

  function peg$parsefilter() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 6).toLowerCase() === peg$c178) {
      s1 = input.substr(peg$currPos, 6);
      peg$currPos += 6;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c179); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 !== peg$FAILED) {
        s3 = peg$parsesearchExpr();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c8(s3);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseuniq() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 4).toLowerCase() === peg$c180) {
      s1 = input.substr(peg$currPos, 4);
      peg$currPos += 4;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c181); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 !== peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c162) {
          s3 = peg$c162;
          peg$currPos += 2;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c163); }
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c182();
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4).toLowerCase() === peg$c180) {
        s1 = input.substr(peg$currPos, 4);
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c181); }
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c183();
      }
      s0 = s1;
    }

    return s0;
  }

  function peg$parseput() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 3).toLowerCase() === peg$c184) {
      s1 = input.substr(peg$currPos, 3);
      peg$currPos += 3;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c185); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseExpressionAssignment();
        if (s3 !== peg$FAILED) {
          s4 = [];
          s5 = peg$currPos;
          s6 = peg$parse__();
          if (s6 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 44) {
              s7 = peg$c60;
              peg$currPos++;
            } else {
              s7 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c61); }
            }
            if (s7 !== peg$FAILED) {
              s8 = peg$parse__();
              if (s8 !== peg$FAILED) {
                s9 = peg$parseExpressionAssignment();
                if (s9 !== peg$FAILED) {
                  peg$savedPos = s5;
                  s6 = peg$c62(s3, s9);
                  s5 = s6;
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            s5 = peg$currPos;
            s6 = peg$parse__();
            if (s6 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 44) {
                s7 = peg$c60;
                peg$currPos++;
              } else {
                s7 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c61); }
              }
              if (s7 !== peg$FAILED) {
                s8 = peg$parse__();
                if (s8 !== peg$FAILED) {
                  s9 = peg$parseExpressionAssignment();
                  if (s9 !== peg$FAILED) {
                    peg$savedPos = s5;
                    s6 = peg$c62(s3, s9);
                    s5 = s6;
                  } else {
                    peg$currPos = s5;
                    s5 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
          }
          if (s4 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c186(s3, s4);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parserename() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 6).toLowerCase() === peg$c187) {
      s1 = input.substr(peg$currPos, 6);
      peg$currPos += 6;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c188); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseFieldAssignment();
        if (s3 !== peg$FAILED) {
          s4 = [];
          s5 = peg$currPos;
          s6 = peg$parse__();
          if (s6 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 44) {
              s7 = peg$c60;
              peg$currPos++;
            } else {
              s7 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c61); }
            }
            if (s7 !== peg$FAILED) {
              s8 = peg$parse__();
              if (s8 !== peg$FAILED) {
                s9 = peg$parseFieldAssignment();
                if (s9 !== peg$FAILED) {
                  peg$savedPos = s5;
                  s6 = peg$c62(s3, s9);
                  s5 = s6;
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            s5 = peg$currPos;
            s6 = peg$parse__();
            if (s6 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 44) {
                s7 = peg$c60;
                peg$currPos++;
              } else {
                s7 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c61); }
              }
              if (s7 !== peg$FAILED) {
                s8 = peg$parse__();
                if (s8 !== peg$FAILED) {
                  s9 = peg$parseFieldAssignment();
                  if (s9 !== peg$FAILED) {
                    peg$savedPos = s5;
                    s6 = peg$c62(s3, s9);
                    s5 = s6;
                  } else {
                    peg$currPos = s5;
                    s5 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
          }
          if (s4 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c189(s3, s4);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseExpressionAssignment() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$currPos;
    s1 = peg$parsefieldName();
    if (s1 !== peg$FAILED) {
      s2 = peg$parse__();
      if (s2 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 61) {
          s3 = peg$c135;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c136); }
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$parse__();
          if (s4 !== peg$FAILED) {
            s5 = peg$parseConditionalExpression();
            if (s5 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c190(s1, s5);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseFieldAssignment() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$currPos;
    s1 = peg$parsefieldRefDotOnly();
    if (s1 !== peg$FAILED) {
      s2 = peg$parse__();
      if (s2 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 61) {
          s3 = peg$c135;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c136); }
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$parse__();
          if (s4 !== peg$FAILED) {
            s5 = peg$parsefieldRefDotOnly();
            if (s5 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c191(s1, s5);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsePrimaryExpression() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$parseStringLiteral();
    if (s0 === peg$FAILED) {
      s0 = peg$parseRegexpLiteral();
      if (s0 === peg$FAILED) {
        s0 = peg$parsePortLiteral();
        if (s0 === peg$FAILED) {
          s0 = peg$parseSubnetLiteral();
          if (s0 === peg$FAILED) {
            s0 = peg$parseAddressLiteral();
            if (s0 === peg$FAILED) {
              s0 = peg$parseFloatLiteral();
              if (s0 === peg$FAILED) {
                s0 = peg$parseIntegerLiteral();
                if (s0 === peg$FAILED) {
                  s0 = peg$parseBooleanLiteral();
                  if (s0 === peg$FAILED) {
                    s0 = peg$parseNullLiteral();
                    if (s0 === peg$FAILED) {
                      s0 = peg$parseFieldReference();
                      if (s0 === peg$FAILED) {
                        s0 = peg$currPos;
                        if (input.charCodeAt(peg$currPos) === 40) {
                          s1 = peg$c19;
                          peg$currPos++;
                        } else {
                          s1 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c20); }
                        }
                        if (s1 !== peg$FAILED) {
                          s2 = peg$parse__();
                          if (s2 !== peg$FAILED) {
                            s3 = peg$parseConditionalExpression();
                            if (s3 !== peg$FAILED) {
                              s4 = peg$parse__();
                              if (s4 !== peg$FAILED) {
                                if (input.charCodeAt(peg$currPos) === 41) {
                                  s5 = peg$c21;
                                  peg$currPos++;
                                } else {
                                  s5 = peg$FAILED;
                                  if (peg$silentFails === 0) { peg$fail(peg$c22); }
                                }
                                if (s5 !== peg$FAILED) {
                                  peg$savedPos = s0;
                                  s1 = peg$c23(s3);
                                  s0 = s1;
                                } else {
                                  peg$currPos = s0;
                                  s0 = peg$FAILED;
                                }
                              } else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                              }
                            } else {
                              peg$currPos = s0;
                              s0 = peg$FAILED;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return s0;
  }

  function peg$parseFieldReference() {
    var s0, s1;

    s0 = peg$currPos;
    s1 = peg$parsefieldName();
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c192(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parseExpression() {
    var s0;

    s0 = peg$parseConditionalExpression();

    return s0;
  }

  function peg$parseConditionalExpression() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;

    s0 = peg$currPos;
    s1 = peg$parseLogicalORExpression();
    if (s1 !== peg$FAILED) {
      s2 = peg$parse__();
      if (s2 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 63) {
          s3 = peg$c193;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c194); }
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$parse__();
          if (s4 !== peg$FAILED) {
            s5 = peg$parseConditionalExpression();
            if (s5 !== peg$FAILED) {
              s6 = peg$parse__();
              if (s6 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 58) {
                  s7 = peg$c195;
                  peg$currPos++;
                } else {
                  s7 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c196); }
                }
                if (s7 !== peg$FAILED) {
                  s8 = peg$parse__();
                  if (s8 !== peg$FAILED) {
                    s9 = peg$parseConditionalExpression();
                    if (s9 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s1 = peg$c197(s1, s5, s9);
                      s0 = s1;
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$parseLogicalORExpression();
    }

    return s0;
  }

  function peg$parseLogicalORExpression() {
    var s0, s1, s2, s3, s4, s5, s6, s7;

    s0 = peg$currPos;
    s1 = peg$parseLogicalANDExpression();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$parse__();
      if (s4 !== peg$FAILED) {
        s5 = peg$parseorToken();
        if (s5 !== peg$FAILED) {
          s6 = peg$parse__();
          if (s6 !== peg$FAILED) {
            s7 = peg$parseLogicalANDExpression();
            if (s7 !== peg$FAILED) {
              s4 = [s4, s5, s6, s7];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        s4 = peg$parse__();
        if (s4 !== peg$FAILED) {
          s5 = peg$parseorToken();
          if (s5 !== peg$FAILED) {
            s6 = peg$parse__();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseLogicalANDExpression();
              if (s7 !== peg$FAILED) {
                s4 = [s4, s5, s6, s7];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c198(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseLogicalANDExpression() {
    var s0, s1, s2, s3, s4, s5, s6, s7;

    s0 = peg$currPos;
    s1 = peg$parseEqualityCompareExpression();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$parse__();
      if (s4 !== peg$FAILED) {
        s5 = peg$parseandToken();
        if (s5 !== peg$FAILED) {
          s6 = peg$parse__();
          if (s6 !== peg$FAILED) {
            s7 = peg$parseEqualityCompareExpression();
            if (s7 !== peg$FAILED) {
              s4 = [s4, s5, s6, s7];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        s4 = peg$parse__();
        if (s4 !== peg$FAILED) {
          s5 = peg$parseandToken();
          if (s5 !== peg$FAILED) {
            s6 = peg$parse__();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseEqualityCompareExpression();
              if (s7 !== peg$FAILED) {
                s4 = [s4, s5, s6, s7];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c198(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseEqualityCompareExpression() {
    var s0, s1, s2, s3, s4, s5, s6, s7;

    s0 = peg$currPos;
    s1 = peg$parseRelativeExpression();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$parse__();
      if (s4 !== peg$FAILED) {
        s5 = peg$parseEqualityComparator();
        if (s5 !== peg$FAILED) {
          s6 = peg$parse__();
          if (s6 !== peg$FAILED) {
            s7 = peg$parseRelativeExpression();
            if (s7 !== peg$FAILED) {
              s4 = [s4, s5, s6, s7];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        s4 = peg$parse__();
        if (s4 !== peg$FAILED) {
          s5 = peg$parseEqualityComparator();
          if (s5 !== peg$FAILED) {
            s6 = peg$parse__();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseRelativeExpression();
              if (s7 !== peg$FAILED) {
                s4 = [s4, s5, s6, s7];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c198(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseEqualityOperator() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 2) === peg$c199) {
      s1 = peg$c199;
      peg$currPos += 2;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c200); }
    }
    if (s1 === peg$FAILED) {
      if (input.substr(peg$currPos, 2) === peg$c201) {
        s1 = peg$c201;
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c202); }
      }
      if (s1 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 61) {
          s1 = peg$c135;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c136); }
        }
        if (s1 === peg$FAILED) {
          if (input.substr(peg$currPos, 2) === peg$c203) {
            s1 = peg$c203;
            peg$currPos += 2;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c204); }
          }
        }
      }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c70();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseEqualityComparator() {
    var s0, s1;

    s0 = peg$parseEqualityOperator();
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2) === peg$c73) {
        s1 = peg$c73;
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c205); }
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c70();
      }
      s0 = s1;
    }

    return s0;
  }

  function peg$parseRelativeExpression() {
    var s0, s1, s2, s3, s4, s5, s6, s7;

    s0 = peg$currPos;
    s1 = peg$parseAdditiveExpression();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$parse__();
      if (s4 !== peg$FAILED) {
        s5 = peg$parseRelativeOperator();
        if (s5 !== peg$FAILED) {
          s6 = peg$parse__();
          if (s6 !== peg$FAILED) {
            s7 = peg$parseAdditiveExpression();
            if (s7 !== peg$FAILED) {
              s4 = [s4, s5, s6, s7];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        s4 = peg$parse__();
        if (s4 !== peg$FAILED) {
          s5 = peg$parseRelativeOperator();
          if (s5 !== peg$FAILED) {
            s6 = peg$parse__();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseAdditiveExpression();
              if (s7 !== peg$FAILED) {
                s4 = [s4, s5, s6, s7];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c198(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseRelativeOperator() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 2) === peg$c206) {
      s1 = peg$c206;
      peg$currPos += 2;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c207); }
    }
    if (s1 === peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 60) {
        s1 = peg$c208;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c209); }
      }
      if (s1 === peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c210) {
          s1 = peg$c210;
          peg$currPos += 2;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c211); }
        }
        if (s1 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 62) {
            s1 = peg$c212;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c213); }
          }
        }
      }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c70();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseAdditiveExpression() {
    var s0, s1, s2, s3, s4, s5, s6, s7;

    s0 = peg$currPos;
    s1 = peg$parseMultiplicativeExpression();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$parse__();
      if (s4 !== peg$FAILED) {
        s5 = peg$parseAdditiveOperator();
        if (s5 !== peg$FAILED) {
          s6 = peg$parse__();
          if (s6 !== peg$FAILED) {
            s7 = peg$parseMultiplicativeExpression();
            if (s7 !== peg$FAILED) {
              s4 = [s4, s5, s6, s7];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        s4 = peg$parse__();
        if (s4 !== peg$FAILED) {
          s5 = peg$parseAdditiveOperator();
          if (s5 !== peg$FAILED) {
            s6 = peg$parse__();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseMultiplicativeExpression();
              if (s7 !== peg$FAILED) {
                s4 = [s4, s5, s6, s7];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c198(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseAdditiveOperator() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 43) {
      s1 = peg$c214;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c215); }
    }
    if (s1 === peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 45) {
        s1 = peg$c16;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c17); }
      }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c70();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseMultiplicativeExpression() {
    var s0, s1, s2, s3, s4, s5, s6, s7;

    s0 = peg$currPos;
    s1 = peg$parseNotExpression();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$parse__();
      if (s4 !== peg$FAILED) {
        s5 = peg$parseMultiplicativeOperator();
        if (s5 !== peg$FAILED) {
          s6 = peg$parse__();
          if (s6 !== peg$FAILED) {
            s7 = peg$parseNotExpression();
            if (s7 !== peg$FAILED) {
              s4 = [s4, s5, s6, s7];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        s4 = peg$parse__();
        if (s4 !== peg$FAILED) {
          s5 = peg$parseMultiplicativeOperator();
          if (s5 !== peg$FAILED) {
            s6 = peg$parse__();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseNotExpression();
              if (s7 !== peg$FAILED) {
                s4 = [s4, s5, s6, s7];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c198(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseMultiplicativeOperator() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 42) {
      s1 = peg$c24;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c25); }
    }
    if (s1 === peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 47) {
        s1 = peg$c216;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c217); }
      }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c70();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseNotExpression() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 33) {
      s1 = peg$c13;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c14); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse__();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseNotExpression();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c218(s3);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$parseCastExpression();
    }

    return s0;
  }

  function peg$parseCastExpression() {
    var s0, s1, s2, s3, s4, s5, s6;

    s0 = peg$currPos;
    s1 = peg$parseCallExpression();
    if (s1 !== peg$FAILED) {
      s2 = peg$currPos;
      s3 = peg$parse__();
      if (s3 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 58) {
          s4 = peg$c195;
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c196); }
        }
        if (s4 !== peg$FAILED) {
          s5 = peg$parse__();
          if (s5 !== peg$FAILED) {
            s6 = peg$parseZngType();
            if (s6 !== peg$FAILED) {
              peg$savedPos = s2;
              s3 = peg$c219(s1, s6);
              s2 = s3;
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c220(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseZngType() {
    var s0;

    if (input.substr(peg$currPos, 4) === peg$c221) {
      s0 = peg$c221;
      peg$currPos += 4;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c222); }
    }
    if (s0 === peg$FAILED) {
      if (input.substr(peg$currPos, 4) === peg$c223) {
        s0 = peg$c223;
        peg$currPos += 4;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c224); }
      }
      if (s0 === peg$FAILED) {
        if (input.substr(peg$currPos, 5) === peg$c225) {
          s0 = peg$c225;
          peg$currPos += 5;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c226); }
        }
        if (s0 === peg$FAILED) {
          if (input.substr(peg$currPos, 6) === peg$c227) {
            s0 = peg$c227;
            peg$currPos += 6;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c228); }
          }
          if (s0 === peg$FAILED) {
            if (input.substr(peg$currPos, 5) === peg$c229) {
              s0 = peg$c229;
              peg$currPos += 5;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c230); }
            }
            if (s0 === peg$FAILED) {
              if (input.substr(peg$currPos, 6) === peg$c231) {
                s0 = peg$c231;
                peg$currPos += 6;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c232); }
              }
              if (s0 === peg$FAILED) {
                if (input.substr(peg$currPos, 5) === peg$c233) {
                  s0 = peg$c233;
                  peg$currPos += 5;
                } else {
                  s0 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c234); }
                }
                if (s0 === peg$FAILED) {
                  if (input.substr(peg$currPos, 6) === peg$c235) {
                    s0 = peg$c235;
                    peg$currPos += 6;
                  } else {
                    s0 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c236); }
                  }
                  if (s0 === peg$FAILED) {
                    if (input.substr(peg$currPos, 7) === peg$c237) {
                      s0 = peg$c237;
                      peg$currPos += 7;
                    } else {
                      s0 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c238); }
                    }
                    if (s0 === peg$FAILED) {
                      if (input.substr(peg$currPos, 6) === peg$c239) {
                        s0 = peg$c239;
                        peg$currPos += 6;
                      } else {
                        s0 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c240); }
                      }
                      if (s0 === peg$FAILED) {
                        if (input.substr(peg$currPos, 7) === peg$c241) {
                          s0 = peg$c241;
                          peg$currPos += 7;
                        } else {
                          s0 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c242); }
                        }
                        if (s0 === peg$FAILED) {
                          if (input.substr(peg$currPos, 2) === peg$c243) {
                            s0 = peg$c243;
                            peg$currPos += 2;
                          } else {
                            s0 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c244); }
                          }
                          if (s0 === peg$FAILED) {
                            if (input.substr(peg$currPos, 3) === peg$c245) {
                              s0 = peg$c245;
                              peg$currPos += 3;
                            } else {
                              s0 = peg$FAILED;
                              if (peg$silentFails === 0) { peg$fail(peg$c246); }
                            }
                            if (s0 === peg$FAILED) {
                              if (input.substr(peg$currPos, 4) === peg$c247) {
                                s0 = peg$c247;
                                peg$currPos += 4;
                              } else {
                                s0 = peg$FAILED;
                                if (peg$silentFails === 0) { peg$fail(peg$c248); }
                              }
                              if (s0 === peg$FAILED) {
                                if (input.substr(peg$currPos, 8) === peg$c249) {
                                  s0 = peg$c249;
                                  peg$currPos += 8;
                                } else {
                                  s0 = peg$FAILED;
                                  if (peg$silentFails === 0) { peg$fail(peg$c250); }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return s0;
  }

  function peg$parseCallExpression() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$currPos;
    s1 = peg$parseFunctionName();
    if (s1 !== peg$FAILED) {
      s2 = peg$parse__();
      if (s2 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 40) {
          s3 = peg$c19;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c20); }
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$parseArgumentList();
          if (s4 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 41) {
              s5 = peg$c21;
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c22); }
            }
            if (s5 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c251(s1, s4);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$parseDereferenceExpression();
    }

    return s0;
  }

  function peg$parseFunctionName() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parseFunctionNameStart();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$parseFunctionNameRest();
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$parseFunctionNameRest();
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c70();
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseFunctionNameStart() {
    var s0;

    if (peg$c252.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c253); }
    }

    return s0;
  }

  function peg$parseFunctionNameRest() {
    var s0;

    s0 = peg$parseFunctionNameStart();
    if (s0 === peg$FAILED) {
      if (peg$c254.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c255); }
      }
    }

    return s0;
  }

  function peg$parseArgumentList() {
    var s0, s1, s2, s3, s4, s5, s6, s7;

    s0 = peg$currPos;
    s1 = peg$parseConditionalExpression();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$parse__();
      if (s4 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 44) {
          s5 = peg$c60;
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c61); }
        }
        if (s5 !== peg$FAILED) {
          s6 = peg$parse__();
          if (s6 !== peg$FAILED) {
            s7 = peg$parseConditionalExpression();
            if (s7 !== peg$FAILED) {
              peg$savedPos = s3;
              s4 = peg$c256(s1, s7);
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        s4 = peg$parse__();
        if (s4 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 44) {
            s5 = peg$c60;
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c61); }
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$parse__();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseConditionalExpression();
              if (s7 !== peg$FAILED) {
                peg$savedPos = s3;
                s4 = peg$c256(s1, s7);
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c257(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parse__();
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c258();
      }
      s0 = s1;
    }

    return s0;
  }

  function peg$parseDereferenceExpression() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;

    s0 = peg$currPos;
    s1 = peg$parsePrimaryExpression();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$parse__();
      if (s4 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 91) {
          s5 = peg$c84;
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c85); }
        }
        if (s5 !== peg$FAILED) {
          s6 = peg$parse__();
          if (s6 !== peg$FAILED) {
            s7 = peg$parseConditionalExpression();
            if (s7 !== peg$FAILED) {
              s8 = peg$parse__();
              if (s8 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 93) {
                  s9 = peg$c86;
                  peg$currPos++;
                } else {
                  s9 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c87); }
                }
                if (s9 !== peg$FAILED) {
                  s4 = [s4, s5, s6, s7, s8, s9];
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      if (s3 === peg$FAILED) {
        s3 = peg$currPos;
        s4 = peg$parse__();
        if (s4 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 46) {
            s5 = peg$c81;
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c82); }
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$parse__();
            if (s6 !== peg$FAILED) {
              s7 = peg$currPos;
              s8 = peg$parsefieldName();
              if (s8 !== peg$FAILED) {
                peg$savedPos = s7;
                s8 = peg$c259();
              }
              s7 = s8;
              if (s7 !== peg$FAILED) {
                s4 = [s4, s5, s6, s7];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        s4 = peg$parse__();
        if (s4 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 91) {
            s5 = peg$c84;
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c85); }
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$parse__();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseConditionalExpression();
              if (s7 !== peg$FAILED) {
                s8 = peg$parse__();
                if (s8 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 93) {
                    s9 = peg$c86;
                    peg$currPos++;
                  } else {
                    s9 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c87); }
                  }
                  if (s9 !== peg$FAILED) {
                    s4 = [s4, s5, s6, s7, s8, s9];
                    s3 = s4;
                  } else {
                    peg$currPos = s3;
                    s3 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        if (s3 === peg$FAILED) {
          s3 = peg$currPos;
          s4 = peg$parse__();
          if (s4 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 46) {
              s5 = peg$c81;
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c82); }
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$parse__();
              if (s6 !== peg$FAILED) {
                s7 = peg$currPos;
                s8 = peg$parsefieldName();
                if (s8 !== peg$FAILED) {
                  peg$savedPos = s7;
                  s8 = peg$c259();
                }
                s7 = s8;
                if (s7 !== peg$FAILED) {
                  s4 = [s4, s5, s6, s7];
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c260(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseduration() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$parseseconds();
    if (s0 === peg$FAILED) {
      s0 = peg$parseminutes();
      if (s0 === peg$FAILED) {
        s0 = peg$parsehours();
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parsehours();
          if (s1 !== peg$FAILED) {
            s2 = peg$parse_();
            if (s2 !== peg$FAILED) {
              if (input.substr(peg$currPos, 3) === peg$c68) {
                s3 = peg$c68;
                peg$currPos += 3;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c261); }
              }
              if (s3 !== peg$FAILED) {
                s4 = peg$parse_();
                if (s4 !== peg$FAILED) {
                  s5 = peg$parseminutes();
                  if (s5 !== peg$FAILED) {
                    s1 = [s1, s2, s3, s4, s5];
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$parsedays();
            if (s0 === peg$FAILED) {
              s0 = peg$parseweeks();
            }
          }
        }
      }
    }

    return s0;
  }

  function peg$parsesec_abbrev() {
    var s0;

    if (input.substr(peg$currPos, 7) === peg$c262) {
      s0 = peg$c262;
      peg$currPos += 7;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c263); }
    }
    if (s0 === peg$FAILED) {
      if (input.substr(peg$currPos, 6) === peg$c264) {
        s0 = peg$c264;
        peg$currPos += 6;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c265); }
      }
      if (s0 === peg$FAILED) {
        if (input.substr(peg$currPos, 4) === peg$c266) {
          s0 = peg$c266;
          peg$currPos += 4;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c267); }
        }
        if (s0 === peg$FAILED) {
          if (input.substr(peg$currPos, 3) === peg$c268) {
            s0 = peg$c268;
            peg$currPos += 3;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c269); }
          }
          if (s0 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 115) {
              s0 = peg$c270;
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c271); }
            }
          }
        }
      }
    }

    return s0;
  }

  function peg$parsemin_abbrev() {
    var s0;

    if (input.substr(peg$currPos, 7) === peg$c272) {
      s0 = peg$c272;
      peg$currPos += 7;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c273); }
    }
    if (s0 === peg$FAILED) {
      if (input.substr(peg$currPos, 6) === peg$c274) {
        s0 = peg$c274;
        peg$currPos += 6;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c275); }
      }
      if (s0 === peg$FAILED) {
        if (input.substr(peg$currPos, 4) === peg$c276) {
          s0 = peg$c276;
          peg$currPos += 4;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c277); }
        }
        if (s0 === peg$FAILED) {
          if (input.substr(peg$currPos, 3) === peg$c116) {
            s0 = peg$c116;
            peg$currPos += 3;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c278); }
          }
          if (s0 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 109) {
              s0 = peg$c279;
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c280); }
            }
          }
        }
      }
    }

    return s0;
  }

  function peg$parsehour_abbrev() {
    var s0;

    if (input.substr(peg$currPos, 5) === peg$c281) {
      s0 = peg$c281;
      peg$currPos += 5;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c282); }
    }
    if (s0 === peg$FAILED) {
      if (input.substr(peg$currPos, 3) === peg$c283) {
        s0 = peg$c283;
        peg$currPos += 3;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c284); }
      }
      if (s0 === peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c285) {
          s0 = peg$c285;
          peg$currPos += 2;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c286); }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 104) {
            s0 = peg$c287;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c288); }
          }
          if (s0 === peg$FAILED) {
            if (input.substr(peg$currPos, 4) === peg$c289) {
              s0 = peg$c289;
              peg$currPos += 4;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c290); }
            }
          }
        }
      }
    }

    return s0;
  }

  function peg$parseday_abbrev() {
    var s0;

    if (input.substr(peg$currPos, 4) === peg$c291) {
      s0 = peg$c291;
      peg$currPos += 4;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c292); }
    }
    if (s0 === peg$FAILED) {
      if (input.substr(peg$currPos, 3) === peg$c293) {
        s0 = peg$c293;
        peg$currPos += 3;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c294); }
      }
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 100) {
          s0 = peg$c295;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c296); }
        }
      }
    }

    return s0;
  }

  function peg$parseweek_abbrev() {
    var s0;

    if (input.substr(peg$currPos, 5) === peg$c297) {
      s0 = peg$c297;
      peg$currPos += 5;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c298); }
    }
    if (s0 === peg$FAILED) {
      if (input.substr(peg$currPos, 4) === peg$c299) {
        s0 = peg$c299;
        peg$currPos += 4;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c300); }
      }
      if (s0 === peg$FAILED) {
        if (input.substr(peg$currPos, 3) === peg$c301) {
          s0 = peg$c301;
          peg$currPos += 3;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c302); }
        }
        if (s0 === peg$FAILED) {
          if (input.substr(peg$currPos, 2) === peg$c303) {
            s0 = peg$c303;
            peg$currPos += 2;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c304); }
          }
          if (s0 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 119) {
              s0 = peg$c305;
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c306); }
            }
          }
        }
      }
    }

    return s0;
  }

  function peg$parseseconds() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 6) === peg$c264) {
      s1 = peg$c264;
      peg$currPos += 6;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c265); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c307();
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parseunsignedInteger();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 === peg$FAILED) {
          s2 = null;
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parsesec_abbrev();
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c308(s1);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }

    return s0;
  }

  function peg$parseminutes() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 6) === peg$c274) {
      s1 = peg$c274;
      peg$currPos += 6;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c275); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c309();
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parseunsignedInteger();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 === peg$FAILED) {
          s2 = null;
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parsemin_abbrev();
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c310(s1);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }

    return s0;
  }

  function peg$parsehours() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 4) === peg$c289) {
      s1 = peg$c289;
      peg$currPos += 4;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c290); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c311();
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parseunsignedInteger();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 === peg$FAILED) {
          s2 = null;
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parsehour_abbrev();
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c312(s1);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }

    return s0;
  }

  function peg$parsedays() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 3) === peg$c293) {
      s1 = peg$c293;
      peg$currPos += 3;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c294); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c313();
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parseunsignedInteger();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 === peg$FAILED) {
          s2 = null;
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseday_abbrev();
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c314(s1);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }

    return s0;
  }

  function peg$parseweeks() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parseunsignedInteger();
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parseweek_abbrev();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c315(s1);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseaddr() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8;

    s0 = peg$currPos;
    s1 = peg$currPos;
    s2 = peg$parseunsignedInteger();
    if (s2 !== peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 46) {
        s3 = peg$c81;
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c82); }
      }
      if (s3 !== peg$FAILED) {
        s4 = peg$parseunsignedInteger();
        if (s4 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 46) {
            s5 = peg$c81;
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c82); }
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$parseunsignedInteger();
            if (s6 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 46) {
                s7 = peg$c81;
                peg$currPos++;
              } else {
                s7 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c82); }
              }
              if (s7 !== peg$FAILED) {
                s8 = peg$parseunsignedInteger();
                if (s8 !== peg$FAILED) {
                  s2 = [s2, s3, s4, s5, s6, s7, s8];
                  s1 = s2;
                } else {
                  peg$currPos = s1;
                  s1 = peg$FAILED;
                }
              } else {
                peg$currPos = s1;
                s1 = peg$FAILED;
              }
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c316();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseport() {
    var s0, s1, s2;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 58) {
      s1 = peg$c195;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c196); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsesuint();
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c36(s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseip6addr() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parseh_prepend();
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parseh_prepend();
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parseip6tail();
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c317(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parseh16();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parseh_append();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parseh_append();
        }
        if (s2 !== peg$FAILED) {
          if (input.substr(peg$currPos, 2) === peg$c318) {
            s3 = peg$c318;
            peg$currPos += 2;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c319); }
          }
          if (s3 !== peg$FAILED) {
            s4 = [];
            s5 = peg$parseh_prepend();
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              s5 = peg$parseh_prepend();
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parseip6tail();
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c320(s1, s2, s4, s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c318) {
          s1 = peg$c318;
          peg$currPos += 2;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c319); }
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parseh_prepend();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parseh_prepend();
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parseip6tail();
            if (s3 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c321(s2, s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parseh16();
          if (s1 !== peg$FAILED) {
            s2 = [];
            s3 = peg$parseh_append();
            while (s3 !== peg$FAILED) {
              s2.push(s3);
              s3 = peg$parseh_append();
            }
            if (s2 !== peg$FAILED) {
              if (input.substr(peg$currPos, 2) === peg$c318) {
                s3 = peg$c318;
                peg$currPos += 2;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c319); }
              }
              if (s3 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c322(s1, s2);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 2) === peg$c318) {
              s1 = peg$c318;
              peg$currPos += 2;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c319); }
            }
            if (s1 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c323();
            }
            s0 = s1;
          }
        }
      }
    }

    return s0;
  }

  function peg$parseip6tail() {
    var s0;

    s0 = peg$parseaddr();
    if (s0 === peg$FAILED) {
      s0 = peg$parseh16();
    }

    return s0;
  }

  function peg$parseh_append() {
    var s0, s1, s2;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 58) {
      s1 = peg$c195;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c196); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parseh16();
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c324(s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseh_prepend() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$parseh16();
    if (s1 !== peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 58) {
        s2 = peg$c195;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c196); }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c325(s1);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsesubnet() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parseaddr();
    if (s1 !== peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 47) {
        s2 = peg$c216;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c217); }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parseunsignedInteger();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c326(s1, s3);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseip6subnet() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parseip6addr();
    if (s1 !== peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 47) {
        s2 = peg$c216;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c217); }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parseunsignedInteger();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c327(s1, s3);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseunsignedInteger() {
    var s0, s1;

    s0 = peg$currPos;
    s1 = peg$parsesuint();
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c328(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parsesuint() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = [];
    if (peg$c79.test(input.charAt(peg$currPos))) {
      s2 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c80); }
    }
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c79.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c80); }
        }
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c70();
    }
    s0 = s1;

    return s0;
  }

  function peg$parsesinteger() {
    var s0, s1, s2;

    s0 = peg$currPos;
    if (peg$c329.test(input.charAt(peg$currPos))) {
      s1 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c330); }
    }
    if (s1 === peg$FAILED) {
      s1 = null;
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsesuint();
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c70();
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsesdouble() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 45) {
      s1 = peg$c16;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c17); }
    }
    if (s1 === peg$FAILED) {
      s1 = null;
    }
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$parsedoubleInteger();
      if (s3 !== peg$FAILED) {
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parsedoubleInteger();
        }
      } else {
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 46) {
          s3 = peg$c81;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c82); }
        }
        if (s3 !== peg$FAILED) {
          s4 = [];
          s5 = peg$parsedoubleDigit();
          if (s5 !== peg$FAILED) {
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              s5 = peg$parsedoubleDigit();
            }
          } else {
            s4 = peg$FAILED;
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parseexponentPart();
            if (s5 === peg$FAILED) {
              s5 = null;
            }
            if (s5 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c332();
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 45) {
        s1 = peg$c16;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c17); }
      }
      if (s1 === peg$FAILED) {
        s1 = null;
      }
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 46) {
          s2 = peg$c81;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c82); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parsedoubleDigit();
          if (s4 !== peg$FAILED) {
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$parsedoubleDigit();
            }
          } else {
            s3 = peg$FAILED;
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parseexponentPart();
            if (s4 === peg$FAILED) {
              s4 = null;
            }
            if (s4 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c332();
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }

    return s0;
  }

  function peg$parsedoubleInteger() {
    var s0, s1, s2, s3;

    if (input.charCodeAt(peg$currPos) === 48) {
      s0 = peg$c333;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c334); }
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (peg$c335.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c336); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        if (peg$c79.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c80); }
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          if (peg$c79.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c80); }
          }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }

    return s0;
  }

  function peg$parsedoubleDigit() {
    var s0;

    if (peg$c79.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c80); }
    }

    return s0;
  }

  function peg$parseexponentPart() {
    var s0, s1, s2;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 1).toLowerCase() === peg$c337) {
      s1 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c338); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsesinteger();
      if (s2 !== peg$FAILED) {
        s1 = [s1, s2];
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseh16() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parsehexdigit();
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parsehexdigit();
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c339();
    }
    s0 = s1;

    return s0;
  }

  function peg$parsehexdigit() {
    var s0;

    if (peg$c340.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c341); }
    }

    return s0;
  }

  function peg$parsesearchWord() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parsesearchWordPart();
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parsesearchWordPart();
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c342(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parsesearchWordPart() {
    var s0, s1, s2;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 92) {
      s1 = peg$c343;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c344); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parseescapeSequence();
      if (s2 === peg$FAILED) {
        s2 = peg$parsesearchEscape();
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c18(s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$currPos;
      peg$silentFails++;
      if (peg$c345.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c346); }
      }
      if (s2 === peg$FAILED) {
        s2 = peg$parsews();
      }
      peg$silentFails--;
      if (s2 === peg$FAILED) {
        s1 = void 0;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        if (input.length > peg$currPos) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c347); }
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c70();
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }

    return s0;
  }

  function peg$parsequotedString() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 34) {
      s1 = peg$c348;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c349); }
    }
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$parsedoubleQuotedChar();
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$parsedoubleQuotedChar();
      }
      if (s2 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 34) {
          s3 = peg$c348;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c349); }
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c350(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 39) {
        s1 = peg$c351;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c352); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parsesingleQuotedChar();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parsesingleQuotedChar();
        }
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 39) {
            s3 = peg$c351;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c352); }
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c350(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }

    return s0;
  }

  function peg$parsedoubleQuotedChar() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$currPos;
    peg$silentFails++;
    if (input.charCodeAt(peg$currPos) === 34) {
      s2 = peg$c348;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c349); }
    }
    if (s2 === peg$FAILED) {
      s2 = peg$parseescapedChar();
    }
    peg$silentFails--;
    if (s2 === peg$FAILED) {
      s1 = void 0;
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      if (input.length > peg$currPos) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c347); }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c70();
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 92) {
        s1 = peg$c343;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c344); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseescapeSequence();
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c18(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }

    return s0;
  }

  function peg$parsesingleQuotedChar() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$currPos;
    peg$silentFails++;
    if (input.charCodeAt(peg$currPos) === 39) {
      s2 = peg$c351;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c352); }
    }
    if (s2 === peg$FAILED) {
      s2 = peg$parseescapedChar();
    }
    peg$silentFails--;
    if (s2 === peg$FAILED) {
      s1 = void 0;
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      if (input.length > peg$currPos) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c347); }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c70();
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 92) {
        s1 = peg$c343;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c344); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseescapeSequence();
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c18(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }

    return s0;
  }

  function peg$parseescapeSequence() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 120) {
      s1 = peg$c353;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c354); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsehexdigit();
      if (s2 !== peg$FAILED) {
        s3 = peg$parsehexdigit();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c355();
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$parsesingleCharEscape();
      if (s0 === peg$FAILED) {
        s0 = peg$parseunicodeEscape();
      }
    }

    return s0;
  }

  function peg$parsesingleCharEscape() {
    var s0, s1;

    if (input.charCodeAt(peg$currPos) === 39) {
      s0 = peg$c351;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c352); }
    }
    if (s0 === peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 34) {
        s0 = peg$c348;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c349); }
      }
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 92) {
          s0 = peg$c343;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c344); }
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 98) {
            s1 = peg$c356;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c357); }
          }
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c358();
          }
          s0 = s1;
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 102) {
              s1 = peg$c359;
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c360); }
            }
            if (s1 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c361();
            }
            s0 = s1;
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (input.charCodeAt(peg$currPos) === 110) {
                s1 = peg$c362;
                peg$currPos++;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c363); }
              }
              if (s1 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c364();
              }
              s0 = s1;
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (input.charCodeAt(peg$currPos) === 114) {
                  s1 = peg$c365;
                  peg$currPos++;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c366); }
                }
                if (s1 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c367();
                }
                s0 = s1;
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  if (input.charCodeAt(peg$currPos) === 116) {
                    s1 = peg$c368;
                    peg$currPos++;
                  } else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c369); }
                  }
                  if (s1 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c370();
                  }
                  s0 = s1;
                  if (s0 === peg$FAILED) {
                    s0 = peg$currPos;
                    if (input.charCodeAt(peg$currPos) === 118) {
                      s1 = peg$c371;
                      peg$currPos++;
                    } else {
                      s1 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c372); }
                    }
                    if (s1 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s1 = peg$c373();
                    }
                    s0 = s1;
                  }
                }
              }
            }
          }
        }
      }
    }

    return s0;
  }

  function peg$parsesearchEscape() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 61) {
      s1 = peg$c135;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c136); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c374();
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 42) {
        s1 = peg$c24;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c25); }
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c375();
      }
      s0 = s1;
    }

    return s0;
  }

  function peg$parseunicodeEscape() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 117) {
      s1 = peg$c376;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c377); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$currPos;
      s3 = peg$parsehexdigit();
      if (s3 !== peg$FAILED) {
        s4 = peg$parsehexdigit();
        if (s4 !== peg$FAILED) {
          s5 = peg$parsehexdigit();
          if (s5 !== peg$FAILED) {
            s6 = peg$parsehexdigit();
            if (s6 !== peg$FAILED) {
              s3 = [s3, s4, s5, s6];
              s2 = s3;
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c378(s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 117) {
        s1 = peg$c376;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c377); }
      }
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 123) {
          s2 = peg$c379;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c380); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$currPos;
          s4 = peg$parsehexdigit();
          if (s4 !== peg$FAILED) {
            s5 = peg$parsehexdigit();
            if (s5 === peg$FAILED) {
              s5 = null;
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$parsehexdigit();
              if (s6 === peg$FAILED) {
                s6 = null;
              }
              if (s6 !== peg$FAILED) {
                s7 = peg$parsehexdigit();
                if (s7 === peg$FAILED) {
                  s7 = null;
                }
                if (s7 !== peg$FAILED) {
                  s8 = peg$parsehexdigit();
                  if (s8 === peg$FAILED) {
                    s8 = null;
                  }
                  if (s8 !== peg$FAILED) {
                    s9 = peg$parsehexdigit();
                    if (s9 === peg$FAILED) {
                      s9 = null;
                    }
                    if (s9 !== peg$FAILED) {
                      s4 = [s4, s5, s6, s7, s8, s9];
                      s3 = s4;
                    } else {
                      peg$currPos = s3;
                      s3 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s3;
                    s3 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
          if (s3 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 125) {
              s4 = peg$c381;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c382); }
            }
            if (s4 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c378(s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }

    return s0;
  }

  function peg$parsereString() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 47) {
      s1 = peg$c216;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c217); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsereBody();
      if (s2 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 47) {
          s3 = peg$c216;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c217); }
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c36(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsereBody() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = [];
    if (peg$c383.test(input.charAt(peg$currPos))) {
      s2 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c384); }
    }
    if (s2 === peg$FAILED) {
      if (input.substr(peg$currPos, 2) === peg$c385) {
        s2 = peg$c385;
        peg$currPos += 2;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c386); }
      }
    }
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c383.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c384); }
        }
        if (s2 === peg$FAILED) {
          if (input.substr(peg$currPos, 2) === peg$c385) {
            s2 = peg$c385;
            peg$currPos += 2;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c386); }
          }
        }
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c70();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseescapedChar() {
    var s0;

    if (peg$c387.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c388); }
    }

    return s0;
  }

  function peg$parsews() {
    var s0;

    if (input.charCodeAt(peg$currPos) === 9) {
      s0 = peg$c389;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c390); }
    }
    if (s0 === peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 11) {
        s0 = peg$c391;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c392); }
      }
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 12) {
          s0 = peg$c393;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c394); }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 32) {
            s0 = peg$c395;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c396); }
          }
          if (s0 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 160) {
              s0 = peg$c397;
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c398); }
            }
            if (s0 === peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 65279) {
                s0 = peg$c399;
                peg$currPos++;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c400); }
              }
            }
          }
        }
      }
    }

    return s0;
  }

  function peg$parse_() {
    var s0, s1;

    peg$silentFails++;
    s0 = [];
    s1 = peg$parsews();
    if (s1 !== peg$FAILED) {
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        s1 = peg$parsews();
      }
    } else {
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c401); }
    }

    return s0;
  }

  function peg$parse__() {
    var s0, s1;

    s0 = [];
    s1 = peg$parsews();
    while (s1 !== peg$FAILED) {
      s0.push(s1);
      s1 = peg$parsews();
    }

    return s0;
  }

  function peg$parseEOF() {
    var s0, s1;

    s0 = peg$currPos;
    peg$silentFails++;
    if (input.length > peg$currPos) {
      s1 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c347); }
    }
    peg$silentFails--;
    if (s1 === peg$FAILED) {
      s0 = void 0;
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }



  let reglob$1 = reglob;

    function makeSequentialProc(procs) {
      return { op: "SequentialProc", procs };
    }

  function makeParallelProc(procs) {
    return { op: "ParallelProc", procs };
  }

  function makeLiteral(type, value) { return { op: "Literal", type, value }; }

  function makeFieldCall(fn, field, param) {
    return { op: "FieldCall", fn, field, param };
  }
  function chainFieldCalls(base, derefs) {
    let ret = { op: "FieldRead", field: base };
    for (let d of derefs) {
      d.field = ret;
      ret = d;
    }
    return ret
  }

  function makeMatchAll() {
    return { op: "MatchAll" };
  }

  function makeSearch(text, value, bareWord) {
    // bare word searches can be anything (*), globs (anything else
    // containing glob meta-characters), or just plain strings.
    if (bareWord && value.type == "string") {
      if (text == "*") {
        return makeMatchAll();
      } else if (reglob$1.IsGlobby(value.value)) {
        value = makeLiteral("regexp", reglob$1.Reglob(value.value));
      }
    }
    return { op: "Search", text, value };
  }

  function makeCompareField(comparator, field, value) {
    return { op: "CompareField", comparator, field, value };
  }

  function makeCompareAny(comparator, recursive, value) {
    return { op: "CompareAny", comparator, recursive, value };
  }

  function makeLogicalNot(expr) { return { op: "LogicalNot", expr }; }

  function makeChain(first, rest, op) {
    if (!rest || rest.length == 0) {
      return first;
    }
    let result = first;
    for (let term of rest) {
      result = { op, left: result, right: term };
    }
    return result;
  }

  function makeOrChain(first, rest) {
    return makeChain(first, rest, "LogicalOr");
  }
  function makeAndChain(first, rest) {
    return makeChain(first, rest, "LogicalAnd");
  }

  function makeArg(name, value) {
    return {name, value};
  }

  function makeSortProc(args, fields) {
    let argsMap = new Map();
    for (let arg of args) {
      if (argsMap.has(arg.name)) {
        throw new Error(`Duplicate argument -${arg.name}`);
      }
      argsMap.set(arg.name, arg.value);
    }

    let sortdir = argsMap.has("r") ? -1 : 1;
    let nullsfirst = (argsMap.get("nulls") === "first");
    return { op: "SortProc", fields, sortdir, nullsfirst };
  }

  function makeTopProc(fields, limit, flush) {
    if (limit === null) { limit = undefined; }
    if (fields === null) { fields = undefined; }
    flush = !!flush;
    return { op: "TopProc", fields, limit, flush};
  }

  function makeFieldAssignment(target, source) { return { target, source }; }
  function makeCutProc(args, first, rest) {
      let complement = false;
      if (args.length > 1) {
        throw new Error(`Duplicate argument -c`);
      }
      if (args.length == 1) {
          complement = true;
      }
      return { op: "CutProc", complement: complement, fields: [first, ...rest] };
  }
  function makeHeadProc(count) { return { op: "HeadProc", count }; }
  function makeTailProc(count) { return { op: "TailProc", count }; }
  function makeUniqProc(cflag) { return { op: "UniqProc", cflag }; }
  function makeFilterProc(filter) { return { op: "FilterProc", filter }; }

  function makeExpressionAssignment(target, expression) { return { target, expression }; }
  function makePutProc(first, rest) {
    return { op: "PutProc", clauses: [first, ...rest] };
  }
  function makeRenameProc(first, rest) {
      return { op: "RenameProc", fields: [first, ...rest] };
  }

  function makeReducer(op, var_, field) {
    if (field === null) { field = undefined; }
    return { op, var: var_, field };
  }
  function overrideReducerVar(reducer, v) {
    reducer.var = v;
    return reducer;
  }

  function makeDuration(seconds) {
    return {type: "Duration", seconds};
  }

  function makeReduceProc(reducers) {
    return { op: "ReduceProc", reducers };
  }

  function makeGroupByKey(target, expression) {
      return { op: "ExpressionAssignment", target, expression };
  }

  function makeGroupByKeys(first, rest) {
    return [first, ...rest];
  }

  function makeGroupByProc(duration, limit, keys, reducers) {
    if (limit === null) { limit = undefined; }
    return { op: "GroupByProc", keys, reducers, duration, limit };
  }

  function makeUnaryExpr(operator, operand) {
    return { op: "UnaryExpr", operator, operand };
  }

  function makeCastExpression(expr, type) {
    return { op: "CastExpr", expr, type };
  }

  function makeBinaryExprChain(first, rest) {
    let ret = first;
    for (let part of rest) {
      ret = { op: "BinaryExpr", operator: part[1], lhs: ret, rhs: part[3] };
    }
    return ret
  }

  function makeConditionalExpr(condition, thenClause, elseClause) {
    return { op: "ConditionalExpr", condition, then: thenClause, else: elseClause };
  }

  function makeFunctionCall(fn, args) {
    return { op: "FunctionCall", function: fn, args };
  }

  function joinChars(chars) {
    return chars.join("");
  }

  function toLowerCase(str) {
    return str.toLowerCase();
  }

  function OR(a, b) {
    return a || b
  }

  function makeUnicodeChar(chars) {
    let n = parseInt(chars.join(""), 16);
    if (n < 0x10000) {
      return String.fromCharCode(n);
    }

    // stupid javascript 16 bit code points...
    n -= 0x10000;
    let surrogate1 = 0xD800 + ((n >> 10) & 0x7ff);
    let surrogate2 = 0xDC00 + (n & 0x3ff);
    return String.fromCharCode(surrogate1) + String.fromCharCode(surrogate2);
  }



  peg$result = peg$startRuleFunction();

  if (peg$result !== peg$FAILED && peg$currPos === input.length) {
    return peg$result;
  } else {
    if (peg$result !== peg$FAILED && peg$currPos < input.length) {
      peg$fail(peg$endExpectation());
    }

    throw peg$buildStructuredError(
      peg$maxFailExpected,
      peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
      peg$maxFailPos < input.length
        ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
        : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
    );
  }
}

var zql = {
  SyntaxError: peg$SyntaxError,
  parse:       peg$parse
};

export default zql;