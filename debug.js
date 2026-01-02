const { MediaGalleryBuilder } = require('discord.js');

const test = new MediaGalleryBuilder();
console.log("--- FUNCTIONS FOUND ---");
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(test)));
console.log("-----------------------");
