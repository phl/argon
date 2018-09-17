// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.defineMode("argon", function(config) {
  var indentUnit = config.indentUnit;
  var curPunc;

  function wordRegexp(words) {
    return new RegExp("^(?:" + words.join("|").replace(/\./g,"\\.") + ")$");
  }

  var ops = wordRegexp(config.argonOps||[]);
  var keywords = wordRegexp(config.argonKeywords||[]);

  var operatorChars = /[*+\-]/;

  var numLiteral = /^(?:\-?(?:\d+|\d*\.\d+))/;

  function tokenBase(stream, state) {
    if (stream.eatSpace()) {type = "ws"; return null;}
    if (stream.match(numLiteral)) {
      return "number";
    }
    var ch = stream.next();
    curPunc = null;
    if (ch == "\"" || ch == "'") {
      state.tokenize = tokenLiteral(ch);
      return state.tokenize(stream, state);
    }
    else if (/[\(\),]/.test(ch)) {
      curPunc = ch;
      return "bracket";
    }
    else if (operatorChars.test(ch)) {
      stream.eatWhile(operatorChars);
      return "operator";
    }
    else {
      stream.eatWhile(/[_\w\d]/);
      var word = stream.current();
      if (ops.test(word))
        return "builtin";
      else if (keywords.test(word))
        return "keyword";
      else
        return "variable";
    }
  }

  function tokenLiteral(quote) {
    return function(stream, state) {
      var escaped = false, ch;
      while ((ch = stream.next()) != null) {
        if (ch == quote && !escaped) {
          state.tokenize = tokenBase;
          break;
        }
        escaped = !escaped && ch == "\\";
      }
      return "string";
    };
  }

  function pushContext(state, type, col) {
    state.context = {prev: state.context, indent: state.indent, col: col, type: type};
  }
  function popContext(state) {
    state.indent = state.context.indent;
    state.context = state.context.prev;
  }

  return {
    startState: function() {
      return {tokenize: tokenBase,
              context: null,
              indent: 0,
              col: 0};
    },

    token: function(stream, state) {
      if (stream.sol()) {
        if (state.context && state.context.align == null) state.context.align = false;
        state.indent = stream.indentation();
      }
      if (stream.eatSpace()) return null;
      var style = state.tokenize(stream, state);

      if (state.context && state.context.align == null) {
        state.context.align = true;
      }

      if (curPunc == "(") pushContext(state, ")", stream.column());
      else if (/[\)]/.test(curPunc)) {
        if (state.context && curPunc == state.context.type) {
          popContext(state);
        }
      }

      return style;
    },

    indent: function(state, textAfter) {
      var firstChar = textAfter && textAfter.charAt(0);
      var context = state.context;

      var closing = context && firstChar == context.type;
      if (!context)
        return 0;
      else if (context.align)
        return context.col + (closing ? 0 : 1);
      else
        return context.indent + (closing ? 0 : indentUnit);
    },

    electricChars: "()"
  };
});

CodeMirror.defineMIME("application/argon-query", "argon");

});
