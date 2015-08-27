var through = require('through2');
var gutil = require('gulp-util');
var path = require('path');
var fs = require('fs');
var Handlebars = require('handlebars');
var Promise = require("bluebird");
Promise.promisifyAll(fs);

var PluginError = gutil.PluginError;
var green = gutil.colors.green;

const PLUGIN_NAME = "gulp-hbs-html";
gutil.log("start to execute " + PLUGIN_NAME);

function execute(options) {
    var firstFile, fileMap = {};

    function transformFile(file, env, cb) {
        if (!firstFile) {
            firstFile = file;
        }
        if (file.isNull()) {
            return cb(null, file);
        }
        if (file.isStream()) {
            this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
            return cb();
        }

        var fileName = path.basename(file.path);
        fileMap[fileName] = file;

        this.push(file);
        cb();
    }

    function flushFn(cb) {
        Handlebars.registerHelper('if_gt', function (a, b, c, options) {
            //如果新页面+老页面 > 2就要输出list.html
            if ((a + b) > c) {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }
        });

        Handlebars.registerHelper('if_eq', function (a, b, options) {
            if (a == b) {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }
        });

        var mailJson = JSON.parse(fileMap['mail.json'].contents.toString()),
            mailTpl = fileMap['mail.hbs'].contents.toString(),
            listJson = JSON.parse(fileMap['list.json'].contents.toString()),
            listTpl = fileMap['list.hbs'].contents.toString();

        var mailContent = Handlebars.compile(mailTpl)({data: mailJson}),
            listContent = Handlebars.compile(listTpl)({data: listJson});
        gutil.log(green("compile hbs to html success!"));

        var mailHtml = new gutil.File({
            cwd: firstFile.cwd,
            base: firstFile.base,
            path: path.join(firstFile.base, 'mail.html'),
            contents: new Buffer(mailContent)
        });

        var listHtmlBase = firstFile.base.replace('mail', 'publish/html');
        var listHtml = new gutil.File({
            cwd: firstFile.cwd,
            base: listHtmlBase,
            path: path.join(listHtmlBase, 'list.html'),
            contents: new Buffer(listContent)
        });

        listHtml.pipe(fs.createWriteStream(path.join(listHtmlBase, 'list.html'), {flags: 'w'}));
        //this.push(listHtml);
        gutil.log(green("generate list.html success!"));
        this.push(mailHtml);
        cb(null);
    }

    return through.obj(transformFile, flushFn);
}

module.exports = execute;