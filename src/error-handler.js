/*
 * @todo mod regex for 'at [cwd]/views/game/levels/level-00.pug line 1'
 * @todo use 'http-status-codes' package
 */

import { Router } from 'express';
var router = new Router();

/*======================================
=            Error Handlers            =
======================================*/

router.use(function error404handler(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

/*=================================================
=            Development Error Handler            =
=             (will print stacktrace)             =
=================================================*/

router.use(function devErrorHandler(err, req, res, next) {
  if (req.app.get('env') !== 'development') {
    return next();
  }

  var _ = require('lodash');
  var pug = require('pug');
  var sprintf = require('sprintf-js').sprintf;

  function stripHTML(html) {
    return !html ? '' : html.replace(/(<([^>]+)>)/ig, "");
  }

  function abbreviateRootDir(filePath) {
    abbrPattern = abbrPattern || new RegExp(sprintf(
      `(%s|(?:%s)?%s)`, 
      _.escapeRegExp(rootShorthand),
      pathSeparator.source,
      escapedRootDir.replace(new RegExp('^'+pathSeparator.source, 'g'), '')
    ), 'g');

    return !filePath ? '' : filePath.replace(
      abbrPattern,
      pug.render(`abbr(title="${escapedRootDir}") ${rootShorthand}`)
    );
  }
  function stylizeFilePath(filePath) {
    return filePath ? pug.render('span.file-path ' + filePath) : '';
  }

  function stylizeLineNum(lineNum) {
    return lineNum ? pug.render('span.line-num ' + lineNum) : '';
  }

  function stylizeColNum(colNum) {
    return colNum ? pug.render('span.col-num ' + colNum) : '';
  }

  function stylizeErrorInfo(errorInfo) {
    return errorInfo ? pug.render('span.error-info.bg-danger ' + errorInfo) : '';
  }

  err.status = err.status || 500;
  res.status(err.status);

  err.stack = stripHTML(err.stack);

  var renderParams = {
    title: `Error ` + err.status /* === 500 && matches && errorType ? errorType : err.status*/ ,
    subTitle: err.message /* === 500 && matches && errorFile ? errorFile : err.message*/ ,
    error: err
  };

  // shorten file path
  var escapedRootDir = _.escapeRegExp(process.cwd());
  var rootShorthand = '[cwd]';
  var abbrPattern;
  var propPaths = ['title', 'subTitle', 'error.stack'];

  // stylize stack trace
  var pathSeparator = /[\\\/]/;
  // var filePattern = /([\w\.\-]*\.(js|es6))\W+/g; @todo is necessary?
  var firstCallPattern = /(.+Error): (.+): (.*) (\((\d+)\:(\d+)\))/g;
  var filePathPattern = new RegExp(sprintf(
    /(?:(?:%s|%s)%s)?.*?\.js/.source,
    _.escapeRegExp(rootShorthand),
    escapedRootDir,
    pathSeparator.source
  ), 'g');
  var tracePattern = /at (?:([\w\.\s]*) )?(?:(\[as [A-Za-z\.0-9\S]+?\]) )?.+?(?:(%s)(?:\:(\d+))(?:\:(\d+))|native)\)?/;
  tracePattern = new RegExp(sprintf(tracePattern.source, filePathPattern.source), 'g');
  var traceLineOut = '';

  /*----------  Format first call trace  ----------*/
  renderParams.error.stack = renderParams.error.stack.replace(firstCallPattern, function() {
    var args = Array.from(arguments).map(function(arg) {
        return arg ? arg.toString().trim() : undefined;
      }),
      errorType = args && args[1] || null,
      errorFile = args && args[2] || null,
      errorInfo = args && args[3] || null,
      errorLine = args && args[5] || null,
      errorCol = args && args[6] || null;

    renderParams.title = err.status === 500 && args && errorType + pug.render(`small  at ${errorFile}${stylizeLineNum(':'+errorLine)}${stylizeColNum(':'+errorCol)}`) || err.status;
    renderParams.subTitle = err.status === 500 && args && errorInfo /*+ pug.render(`small `)*/ || err.message;

    return '';
  })
  /*----------  Format call traces  ----------*/
  .replace(tracePattern, function() {
    var args = Array.from(arguments).map(function(arg) {
      return arg ? arg.toString().trim() : undefined;
    });

    var filePathOnly = false;

    if (args[1] === rootShorthand) {
      args[6] = args[1] + '\\' + (args[6] || args[4]);
      args[1] = '';
      filePathOnly = true;
    }

    var [, callTrace, nickname, filePath, lineNum, colNum] = args;

    callTrace = callTrace ? pug.render('span.call-trace ' + callTrace) : '';
    nickname = nickname ? pug.render('span.nickname ' + nickname) + ' ' : '';
    filePath = stylizeFilePath(filePath || '');
    lineNum = stylizeLineNum(':' + lineNum);
    colNum = stylizeColNum(':' + colNum);


    if (filePathOnly) {
      traceLineOut = `at ${filePath}`;
    } else {
      traceLineOut = `at ${callTrace} ${nickname}(${filePath}${lineNum}${colNum})`;
    }

    return traceLineOut.replace('  ', ' ').replace('\)\)', '\)');

  });

  propPaths.forEach(function(propPath) {
    let propValue = _.get(renderParams, propPath).toString();
    propValue = abbreviateRootDir(propValue);
    _.set(renderParams, propPath, propValue);
  });

  res.render('error', renderParams);
});

/*=====  End of Development Error Handler  ======*/

/*=================================================
=             Production Error Handler            =
=         (no stacktraces leaked to user)         =
=================================================*/

function prodErrorHandler(err, req, res) {
  res.status(err.status || 500);
  res.render('error', {
    title: 'Server Error',
    error: {}
  });
}

router.use(prodErrorHandler);

/*=====  End of Production Error Handler  ======*/

/*=====  End of Error Handlers  ======*/

module.exports = router;