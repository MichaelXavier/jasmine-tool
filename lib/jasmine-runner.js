(function(){
  var exec           = require('child_process').exec,
      web           = require('webworker'),
      Configuration = require('config').Configuration,
      Browser       = require(__dirname+'/browser').Browser,
      messages      = {
        initialized:[
          'Jasmine has been installed with example specs.',
          '',
          'To run the server:',
          '',
          'jasmine run',
          '',
          'To run the server and monitor for changes:',
          '',
          'jasmine mon',
          '',
          'To run the automated CI task with WebDriver:',
          '',
          'jasmine ci'

        ].join('\n')
      };
  var commands = {
    init: function(info){
      var workingDir = info.args.length > 0 ? info.args[0] : info.cwd;
      exec('cp -R '+__dirname + '/template/* ' + workingDir, function(err){
        console.log(messages.initialized);
      });
    },
    run: function(){
      loadConfig(function(config){
        var server = require('server').newServer(config);
        server.start();
      });
    },
    mon: function(){
      loadConfig(function(config){
        var server = require('server').newServer(config);
        server.start();
        require('monitor').startMonitor(server);
      });
    },
    ci:function(){
      loadConfig(function(config){
        var worker  = new web.Worker(__dirname + '/server-worker.js'),
            browser = {},
            passed  = true;

        worker.postMessage({name:'start', config:config})
        worker.onmessage = function(e){
          if (e.data.name == 'finished'){
            bindExitCallback(testsPassed(e));
            worker.terminate();
            browser.stop();
          } else if (e.data.name == 'started'){
            browser = new Browser('firefox', 'http://localhost:'+config.server.port);
            browser.start();
          }
        };
        worker.onerror = function(e){
          console.log("[ERROR]" + e.message);
          worker.terminate();
          bindExitCallback(false);
        };
      });
    }
  }
  var run = function(evt){
    commands[evt.command](evt);
  }

  exports.supports = function(command){
    return Object.keys(commands).indexOf(command) > -1;
  }
  exports.run = run;

  function loadConfig(cb){
    // need to fix this eventually, but assumes spec/support has the file
      var file = process.cwd() + "/spec/support/jasmine.json";
      new Configuration(file).load(cb);
  }

  function testsPassed(e) {
    return e.data.results.results.failedCount === 0;
  }

  // This is a horrible ugly hack that *will* cancel any other exit callbacks
  // that may have been registered. I put this in place because most sane CI
  // solutions return a nonzero exit status on build failure to signal to the
  // CI server that it failed. I could not figure out a better way to hook onto
  // everything being finished while keeping scope of what the exit status
  // *should* be.
  function bindExitCallback(success) {
    process.on('exit', function() {
      process.reallyExit(success ? 0 : 1);
    });
  }
})()

