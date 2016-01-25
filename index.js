var denodeify = require('denodeify'),
    fs = require('fs'),
    path = require('path'),
    _ = require('lodash');
    

const localeFileMatch = /^angular-locale_(.*)\.js/;
var inPath = 'node_modules/angular-i18n';
var outDirectory = 'dist/';
denodeify(fs.readdir)(inPath)
    .then(filenames => filenames.filter(isLocaleFile))
    .then(filenames => filenames.map(buildPath.bind(null, inPath)))
    .then(paths => paths.map(getFileContents))
    .then(waitForAll)
    .then(getLocaleInfo)
    .then(writeLocales)
    .then(waitForAll)
    .then(() => process.exit())
    .catch((err) => {
        console.log(err);
        process.exit(1);
    });

function writeLocales(locales){
    return locales.map(locale => writeToFile(locale, outDirectory, locale.id))
}

function getLocaleInfo(contents){
    return contents.map(pullLocale);
}

function toObjectById(locales){
    return locales.reduce(appendToObject.bind(null, 'id'), {});
}

function isLocaleFile(file){
    return file.match(localeFileMatch);
}

function getFileContents(path){
    return denodeify(fs.readFile)(path, 'utf8');
}

function buildPath (inPath, fname){
    return path.join(inPath, fname);
}

function writeToFile(object, path, fileId){
    return denodeify(fs.writeFile)(`${path}${fileId}.json`, JSON.stringify(object), 'utf8');
}




function pullLocale(contents){
    const getLocale = /\$provide\.value\("\$locale"\, ((?:.|\r|\n)+?)\);$/gm;
    var match = getLocale.exec(contents);
    var item = match[1].replace(/(?:,|\s|\n|\r)*"pluralCat".*$/gm, '');
    return JSON.parse(item);
}

function appendToObject(itemField, object, item){
    object[item[itemField]] = getLimitedLocale(item);
    return object
}

function toCachedItem(items){
    var cacheObject = Object.create(null);
    return items.reduce(function(aggregate, current){
        var limited = getLimitedLocale(current);
        var cacheString = JSON.stringify(limited);
        var cacheResult =cacheObject[cacheString];
        var valueToInsert; 
        if(cacheResult){
            valueToInsert = cacheResult;
        } else {
            cacheObject[cacheString] = current.id;
            valueToInsert = limited;
        }
        
        aggregate[current.id] = valueToInsert;
        return aggregate;
    }, {});
}

function getLimitedLocale(locale){
    return _.pick(locale, ['DATETIME_FORMATS'])
}

function waitForAll(promises){
    return Promise.all(promises);
}