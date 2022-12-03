import twitter from 'twitter-text';
const text = 'This is a test tweet with a link to https://example.com with a #javascript, @markibanez and $xrp';
const entities = twitter.extractEntitiesWithIndices(text);
console.log(entities);

const html = twitter.autoLink(text);
console.log(html);