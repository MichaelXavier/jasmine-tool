var express = require ('express'),
  fs = require ('fs'),
  rootDir = process.cwd(),
  app = express.createServer(),
  configuration = {};

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.use(express.staticProvider(rootDir + '/public'));
  app.use(express.staticProvider(__dirname + '/public'));
})

app.get('/spec/*', function(req, res){
  getJavascriptFile(rootDir + configuration.spec_dir, req.params[0], res)
});
app.get('/public/javascript/*', function(req, res){
  getJavascriptFile(rootDir + configuration.src_dir, req.params[0], res)
});
app.get('/', function(req, res){
  configuration.reload(function(configuration){
    if (!configuration.helpers) configuration.helpers = [];
    readFromDir(rootDir, configuration.spec_dir, function(specs){
      // Remove duplicates
      specs = specs.filter(function(f) { return configuration.helpers.indexOf(f) == -1;});
      readFromDir(rootDir, configuration.src_dir, function(src){
        res.render('index.jade', {
          locals:{
            srcs:src,
            helpers:configuration.helpers,
            specs:specs,
            externals: configuration.externals
          },
          layout:false
        });
      });
    });
  });
});

function readFromDir(rootDir, dir, cb){
  fs.readdir(rootDir+dir, function(err, result){
    cb(result.filter(function(name){
      return name.match(/.js$/)
    }).map(function(item){
      return dir+item
    }))
  })
}

function getJavascriptFile(path, filename, res){
  var file = path + filename
  fs.readFile(file, function(err, contents){
    res.send(contents, {'Content-Type':'application/javascript'});
  });
}

function configure(config){
  configuration = config;
  if (typeof configuration.reload != "function") {
    configuration.reload = function(cb){cb(config);}
  }
}

module.exports = {
  routes:app,
  configure:configure
};

