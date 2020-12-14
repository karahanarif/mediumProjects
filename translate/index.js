const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Promise = require('bluebird');
const rp = require('request-promise');
const _ = require('lodash');


const firebase = admin.initializeApp();

const db = admin.firestore();


// RegExp function
var replaceAll = function (str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace);
}


// List of output languages.
const LANGUAGES = ["el", "ca", "hu", "pl", "ja", "da", "sv", "nl", "fi", "id", "ko", "ms", "nb", "no", "th", "vi", "hr", "ro", "sk", "uk", "hi", "pt", "zh-Hans", "zh-Hant", "es", "it", "cs", "ru"];


exports.translateOnWrite = functions.firestore.document('Translate/language-en/Messages/{messageId}').onWrite((change, context) => {
  const snapshot = change.after.data().text;
  const messageId = context.params.messageId;

  const promises = [];

  // Using lodash for getting every language from array
  _.each(LANGUAGES, (lang) => {
      promises.push(createTranslationPromise(lang, snapshot, messageId));
   })

  return Promise.all(promises)
});


// URL to the Google Translate API.
var createTranslateUrl = function (lang, text) {
  let link = `https://www.googleapis.com/language/translate/v2?key=translateapikeyvalue&source=en&target=${lang}&q=${text}`;
  let encodeUrl = encodeURI(link)

  return encodeUrl
}

var createTranslationPromise = function (lang, snapshot, messageId) {
  const text = snapshot;
  let translation = {}


  return rp(createTranslateUrl(lang, text), {resolveWithFullResponse: true}).then(response => {
        let s = (lang + " : " + text);

        if (response.statusCode === 200) {
          const resData = JSON.parse(response.body).data;

          translation[lang] = resData.translations[0].translatedText

          // Fixing characters 
          let textTrans = translation[lang].replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&gt;/g, '>').replace(/&lt;/g, '<');

          let translateRef = db.collection(`Translate/language-${lang}/Messages`);
          
          return translateRef.doc(messageId).set({
            'language' : lang,
            'text' : textTrans,
            'messageId' : messageId
            });
          }
        else throw s;
    });
}