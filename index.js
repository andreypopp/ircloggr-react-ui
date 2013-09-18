var makeApp = require('react-app');

makeApp({'/': './ui.jsx'}, {debug: true}).listen(3000);
