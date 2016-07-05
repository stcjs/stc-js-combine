# stc-js-combine

A STC module that combines js files by resolving import directives.

## Install

```sh
npm install stc-js-combine
```

## How to use

```js
(function() {
 var srcPath = '/resource/js/';
 document.write('<script src="' + srcPath + 'b.js"><\/script>');
 document.write('<script src="' + srcPath + 'c.js"><\/script>');
 document.write('<script src="' + srcPath + 'd.js"><\/script>');
 }());
```

```js
var jsCombine = require('stc-js-combine');

stc.workflow({
  jsCombine: {plugin: jsCombine, include: /\.js$/},
});
```
