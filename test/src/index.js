import sourceMapSupport from 'source-map-support';

// Rather than using mocha's `require` hook
sourceMapSupport.install({
  handleUncaughtExceptions: false
});