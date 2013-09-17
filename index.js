var makeApp = require('react-app');

makeApp({'/': './log.jsx'}, {debug: true}).listen(3000);
