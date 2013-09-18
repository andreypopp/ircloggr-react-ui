/** @jsx React.DOM */

require('./style.css');

var React = require('react-tools/build/modules/React'),
    Page = require('react-app/page'),
    moment = require('moment'),
    md5 = require('md5'),
    URI = require('URIjs'),
    q = require('kew');

var API_URI = "http://vjeux.com:8001/api/utterances/irc.freenode.net/reactjs";

var xhrGet = function(url, cb) {
    var xhr = new global.XMLHttpRequest(), twoHundred = /^20\d$/;
    xhr.onreadystatechange = function() {
      if (4 == xhr.readyState && 0 !== xhr.status) {
        if (twoHundred.test(xhr.status)) cb(null, xhr);
        else cb(xhr, null);
      }
    };
    xhr.onerror = function(e) { return cb(e, null); };
    xhr.open('GET', url, true);
    xhr.send();
};

var getMessages = function(before) {
  var uri = URI(API_URI).addSearch({num: 100}),
      promise = q.defer();

  if (before) {
    uri = uri.addSearch({before: before});
  }

  xhrGet(uri.toString(), function(err, xhr) {
    if (err) {
      promise.reject(err)
    } else {
      promise.resolve(JSON.parse(xhr.responseText));
    }
  });

  return promise;
}

var groupMessages = function(messages) {
  var groups = [],
      current = [];
  messages.forEach(function(m) {
    if (current.length > 0 && current[current.length - 1].who !== m.who) {
      groups.push(current);
      current = [];
    }
    current.push(m);
  });
  return groups;
};

var Timestamp = React.createClass({
  render: function() {
    return (
      <span className="Timestamp">
        {moment.unix(this.props.children).format("HH:mm")}
      </span>
    );
  }
});

var Author = React.createClass({
  render: function() {
    var name = this.props.children,
        h = parseInt(md5.digest_s(name).substr(2, 4), 16),
        color = 'hsl(' + h + ', 68%, 35%)';
    return this.transferPropsTo(
      <span className="Author" style={{color: color}}>{name}</span>
    );
  }
});

var Content = React.createClass({
  render: function() {
    return <span className="Content">{this.linkify(this.props.children)}</span>;
  },

  linkify: function(text) {
    var split = text.split(URI.find_uri_expression);
    var result = [];
    for (var i = 0; i < split.length; ++i) {
      if (split[i] !== undefined) {
        if (i + 1 < split.length && split[i + 1] === undefined) {
          result.push(<a href={split[i]} target="_blank">{split[i]}</a>);
        } else {
          result.push(split[i]);
        }
      }
    }
    return result;
  }
});

var Message = React.createClass({
  shouldComponentUpdate: function() {
    return false;
  },

  render: function() {
    return (
      <div class="Message">
        <Content>{this.props.message.msg}</Content>
      </div>
    );
  }
});

var MessageGroup = React.createClass({
  shouldComponentUpdate: function() {
    return false;
  },

  render: function() {
    return (
      <div class="MessageGroup">
        <Author className="metadata">{this.props.who}</Author>
        {this.props.messages.map(function(m) { return Message({message: m}) })}
      </div>
    );
  }
});

var MessageList = React.createClass({
  getInitialState: function() {
    return { messages: this.props.messages || [], isLoading: false };
  },

  needLoadMore: function() {
    return window.scrollY < 300;
  },

  componentDidMount: function(elem) {
    this.updateScrollPosition();

    if (this.needLoadMore()) {
      this.loadMore();
    }

    window.addEventListener('scroll', function() {
      if (this.needLoadMore()) {
        this.loadMore();
      }
    }.bind(this));
  },

  loadMore: function() {
    var firstID = this.state.messages.length > 0 ?
          this.state.messages[0].id :
          undefined;

    if (this.state.isLoading) {
      return;
    }

    this.props.getMessages(firstID)
      .then(function(messages) {
        this.setState({
          isLoading: false,
          messages: this.state.messages.concat(messages)
        });
      }.bind(this)).end();

    this.setState({isLoading: true});
  },

  componentDidUpdate: function() {
    this.updateScrollPosition();
  },

  updateScrollPosition: function() {
    var elem = this.getDOMNode(),
        count = elem.children.length;

    if (count !== this.lastCount) {
      if (elem.offsetHeight < window.innerHeight) {
        this.loadMore();
      }
      if (!this.lastCount) {
        window.scrollTo(0, elem.offsetHeight);
      } else {
        window.scrollTo(
          document.body.scrollLeft,
          document.body.scrollTop + (
            elem.children[count - this.lastCount].getBoundingClientRect().top -
            elem.getBoundingClientRect().top
          )
        );
      }
    }

    this.lastCount = elem.children.length;
  },

  render: function() {
    this.state.messages.sort(function(a, b) {
      return a.id - b.id;
    });

    var messages = groupMessages(this.state.messages)
      .map(function(g) {
        return MessageGroup({messages: g, who: g[0].who, key: g[0].id});
      });

    return <div className="MessageList">{messages}</div>;
  }
});

var LogViewer = React.createClass({

  render: function() {
    return this.transferPropsTo(
      <Page>
        <head>
          <title>#reactjs on IRC Freenode</title>
        </head>
        <body>
          <MessageList
            messages={this.props.messages}
            getMessages={getMessages} />
        </body>
      </Page>
    );
  }
});

module.exports = {
  getData: function(props) {
    return getMessages().then(function(messages) {
      return {messages: messages}
    });
  },
  Component: LogViewer,
};
