var makeApp = require('react-app'),
    express = require('express'),
    app = express();

app.use(makeApp({'/': './ui.jsx'}, {debug: true}));
app.use('/public', express.static(__dirname + '/public'));
app.listen(3000);
