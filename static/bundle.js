(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var FileNavigator;

FileNavigator = function(file, options) {
  var decode, getProgress, lastPosition, navigator, readChunk, self, size;
  self = this;
  size = file.size;
  file.navigator = this;
  lastPosition = 0;
  getProgress = function() {
    var progress;
    if (!size || size === 0) {
      return 0;
    }
    progress = parseInt(100 * lastPosition / size);
    if (progress > 100) {
      return 100;
    } else {
      return progress;
    }
  };
  readChunk = function(offset, length, callback) {
    var reader;
    lastPosition = offset + length;
    reader = new FileReader;
    reader.onloadend = function(progress) {
      var buffer;
      buffer = void 0;
      if (reader.result) {
        buffer = new Int8Array(reader.result, 0);
        buffer.slice = buffer.subarray;
      }
      callback(progress.err, buffer, progress.loaded);
    };
    reader.readAsArrayBuffer(file.slice(offset, offset + length));
  };
  decode = function(buffer, callback) {
    var reader;
    reader = new FileReader;
    reader.onloadend = function(progress) {
      callback(progress.currentTarget.result);
    };
    reader.readAsText(new Blob([buffer]));
  };
  navigator = new LineNavigator(readChunk, decode, options);
  self.getMilestones = navigator.getMilestones;
  self.readSomeLines = function(index, callback) {
    navigator.readSomeLines(index, function(err, index, lines, eof) {
      callback(err, index, lines, eof, getProgress());
    });
  };
  self.readLines = function(index, count, callback) {
    navigator.readLines(index, count, function(err, index, lines, eof) {
      callback(err, index, lines, eof, getProgress());
    });
  };
  self.find = navigator.find;
  self.findAll = navigator.findAll;
  self.getSize = function(callback) {
    return callback(file ? file.size : 0);
  };
};

module.exports = FileNavigator;



},{}],2:[function(require,module,exports){
var FileNavigator, build_head_table, cast, es_client, field_names, file, get_field_types, hosts, indexToStartWith, index_name, init_ui, linesReadHandler, lines_in_batch, navigator, options, prepare_json, process_lines, readFile, send_to_server, show_progress, type_name;

FileNavigator = require('./filenavigator.coffee');

show_progress = function(progress, number) {
  var bar;
  bar = $(".progress-bar");
  bar.css("width", progress + "%");
  bar.text(progress + "%");
  $('#counter').text(number);
  return console.log(number + " : lines " + progress);
};

hosts = "localhost:9200";

index_name = "govwiki";

type_name = "govs";

es_client = void 0;

field_names = [];

navigator = void 0;

file = void 0;

lines_in_batch = 10000;

indexToStartWith = 0;

options = {
  chunkSize: 1024 * 1024 * 2
};

cast = void 0;

get_field_types = function() {
  var sel, sels, types;
  sels = $('.type-selector');
  types = (function() {
    var j, len, results;
    results = [];
    for (j = 0, len = sels.length; j < len; j++) {
      sel = sels[j];
      results.push(sel.value);
    }
    return results;
  })();
  return types;
};

build_head_table = function() {
  var container, head_navigator;
  container = $('#head_table_container');
  container.html("");
  head_navigator = new FileNavigator(file, {
    chunkSize: 1024 * 128
  });
  head_navigator.readLines(0, 3, function(err, index, lines, eof, progress) {
    var build_data_row, build_field_names_row, build_field_types_row, s;
    if (err) {
      return;
    }
    build_field_names_row = function(line) {
      var name, names, td;
      td = function(name) {
        return "<th>" + (name.replace(/"/g, '')) + "</th>";
      };
      names = line.split(',');
      return ((function() {
        var j, len, results;
        results = [];
        for (j = 0, len = names.length; j < len; j++) {
          name = names[j];
          results.push(td(name));
        }
        return results;
      })()).join("");
    };
    build_field_types_row = function(line) {
      var if_number, if_string, td, value, values;
      if_string = function(v) {
        if (!v) {
          return "selected";
        }
        if (('' + v).indexOf('"') > -1) {
          return "selected";
        }
        return "";
      };
      if_number = function(v) {
        if (if_string(v) === "selected") {
          return "";
        } else {
          return "selected";
        }
      };
      td = function(v) {
        return "<td>\n  <select class=\"type-selector\">\n    <option value=\"String\" " + (if_string(v)) + ">String</option>\n    <option value=\"Number\" " + (if_number(v)) + ">Number</option>\n    <option value=\"Boolean\">Boolean</option>\n  </select> \n</td>";
      };
      values = line.split(',');
      return ((function() {
        var j, len, results;
        results = [];
        for (j = 0, len = values.length; j < len; j++) {
          value = values[j];
          results.push(td(value));
        }
        return results;
      })()).join("");
    };
    build_data_row = function(line) {
      var td, value, values;
      td = function(v) {
        return "<td>" + v + "</td>";
      };
      values = line.split(',');
      return ((function() {
        var j, len, results;
        results = [];
        for (j = 0, len = values.length; j < len; j++) {
          value = values[j];
          results.push(td(value));
        }
        return results;
      })()).join("");
    };
    s = "<table style=\"border:1px solid silver;\">\n  <thead>\n    <tr>" + (build_field_names_row(lines[0])) + "</tr>\n    <tr>" + (build_field_types_row(lines[1])) + "</tr>\n  </thead>\n  <tbody>\n    <tr>" + (build_data_row(lines[1])) + "</tr>\n    <tr>" + (build_data_row(lines[2])) + "</tr>\n  </tbody>\n</table>";
    console.log(s);
    container.html(s);
  });
};

init_ui = function() {
  file = document.getElementById('chooseFileButton').files[0];
  show_progress(0, 0);
  return build_head_table();
};

prepare_json = function(index, lines) {
  var field_values, i, j, len, line, operation, record, res;
  if (!lines) {
    return;
  }
  res = [];
  if (index === 0) {
    field_names = lines[0].replace(/"/g, '').split(',');
    lines.shift();
  }
  for (i = j = 0, len = lines.length; j < len; i = ++j) {
    line = lines[i];
    operation = {
      index: {
        _index: index_name,
        _type: type_name,
        _id: index + i
      }
    };
    field_values = line.split(',');
    record = CSV.parse(line, {
      header: field_names,
      cellDelimiter: ',',
      cast: cast
    })[0];
    res.push(operation);
    res.push(record);
  }
  return res;
};

send_to_server = function(index, lines, eof, progress, json) {
  es_client.bulk({
    body: json
  }, (function(_this) {
    return function(err, resp) {
      if (err) {
        alert("Sorry, " + err.message);
        console.log(err);
        return;
      } else {
        show_progress(progress, index + lines.length);
        console.log(" " + lines.length + " lines sent");
        if (eof) {
          return;
        }
        navigator.readSomeLines(index + lines.length, linesReadHandler);
        return;
      }
    };
  })(this));
};

process_lines = function(index, lines, eof, progress) {
  var json;
  json = prepare_json(index, lines);
  return send_to_server(index, lines, eof, progress, json);
};

linesReadHandler = function(err, index, lines, eof, progress) {
  if (err) {
    return;
  }
  process_lines(index, lines, eof, progress);
};

readFile = function() {
  hosts = $('#hosts').val();
  index_name = $('#indexName').val();
  type_name = $('#typeName').val();
  es_client = new $.es.Client({
    hosts: hosts
  });
  cast = get_field_types();
  navigator = new FileNavigator(file, options);
  navigator.readSomeLines(indexToStartWith, linesReadHandler);
};

$('#chooseFileButton').change((function(_this) {
  return function() {
    return init_ui();
  };
})(this));

$('#readFileButton').click((function(_this) {
  return function() {
    return readFile();
  };
})(this));



},{"./filenavigator.coffee":1}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL3ZhZGltaXZsZXYvUHJvamVjdHMvX3Byb2plY3RzL2VsYXN0aWNzZWFyY2gtZGF0YS1sb2FkZXIvY29mZmVlL2ZpbGVuYXZpZ2F0b3IuY29mZmVlIiwiL1VzZXJzL3ZhZGltaXZsZXYvUHJvamVjdHMvX3Byb2plY3RzL2VsYXN0aWNzZWFyY2gtZGF0YS1sb2FkZXIvY29mZmVlL21haW4uY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDUUEsSUFBQSxhQUFBOztBQUFBLGFBQUEsR0FBZ0IsU0FBQyxJQUFELEVBQU8sT0FBUCxHQUFBO0FBQ2QsTUFBQSxtRUFBQTtBQUFBLEVBQUEsSUFBQSxHQUFPLElBQVAsQ0FBQTtBQUFBLEVBQ0EsSUFBQSxHQUFPLElBQUksQ0FBQyxJQURaLENBQUE7QUFBQSxFQUVBLElBQUksQ0FBQyxTQUFMLEdBQWlCLElBRmpCLENBQUE7QUFBQSxFQUlBLFlBQUEsR0FBZSxDQUpmLENBQUE7QUFBQSxFQU1BLFdBQUEsR0FBYyxTQUFBLEdBQUE7QUFDWixRQUFBLFFBQUE7QUFBQSxJQUFBLElBQUcsQ0FBQSxJQUFBLElBQVMsSUFBQSxLQUFRLENBQXBCO0FBQ0UsYUFBTyxDQUFQLENBREY7S0FBQTtBQUFBLElBRUEsUUFBQSxHQUFXLFFBQUEsQ0FBUyxHQUFBLEdBQU0sWUFBTixHQUFxQixJQUE5QixDQUZYLENBQUE7QUFHQSxJQUFBLElBQUcsUUFBQSxHQUFXLEdBQWQ7YUFBdUIsSUFBdkI7S0FBQSxNQUFBO2FBQWdDLFNBQWhDO0tBSlk7RUFBQSxDQU5kLENBQUE7QUFBQSxFQWdCQSxTQUFBLEdBQVksU0FBQyxNQUFELEVBQVMsTUFBVCxFQUFpQixRQUFqQixHQUFBO0FBQ1YsUUFBQSxNQUFBO0FBQUEsSUFBQSxZQUFBLEdBQWUsTUFBQSxHQUFT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dGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxuIyBBbGxvd3MgdG8gbmF2aWdhdGUgZ2l2ZW4gc291cmNlcyBsaW5lcywgc2F2aW5nIG1pbGVzdG9uZXMgdG8gb3B0aW1pemUgcmFuZG9tIHJlYWRpbmdcbiMgb3B0aW9ucyA9IHtcbiMgICAgICAgIG1pbGVzdG9uZXM6IFtdLCAgICAgICAgIC8vIG9wdGlvbmFsOiBhcnJheSBvZiBtaWxlc3RvbmVzLCB3aGljaCBjYW4gYmUgb2J0YWluZWQgYnkgZ2V0TWlsZXN0b25lcygpIG1ldGhvZCBhbmQgc3RvcmVkIHRvIHNwZWVkIHVwIHJhbmRvbSByZWFkaW5nIGluIGZ1dHVyZVxuIyAgICAgICAgY2h1bmtTaXplOiAxMDI0ICogNCwgICAgLy8gb3B0aW9uYWw6IHNpemUgb2YgY2h1bmsgdG8gcmVhZCBhdCBvbmNlXG4jIH1cblxuXG5GaWxlTmF2aWdhdG9yID0gKGZpbGUsIG9wdGlvbnMpIC0+XG4gIHNlbGYgPSB0aGlzXG4gIHNpemUgPSBmaWxlLnNpemVcbiAgZmlsZS5uYXZpZ2F0b3IgPSB0aGlzXG4gICMgcmV1c2UgbWlsZXN0b25lcyBsYXRlclxuICBsYXN0UG9zaXRpb24gPSAwXG5cbiAgZ2V0UHJvZ3Jlc3MgPSAtPlxuICAgIGlmICFzaXplIG9yIHNpemUgPT0gMFxuICAgICAgcmV0dXJuIDBcbiAgICBwcm9ncmVzcyA9IHBhcnNlSW50KDEwMCAqIGxhc3RQb3NpdGlvbiAvIHNpemUpXG4gICAgaWYgcHJvZ3Jlc3MgPiAxMDAgdGhlbiAxMDAgZWxzZSBwcm9ncmVzc1xuXG5cblxuICAjIGNhbGxiYWNrKGVyciwgYnVmZmVyLCBieXRlc1JlYWQpXG5cbiAgcmVhZENodW5rID0gKG9mZnNldCwgbGVuZ3RoLCBjYWxsYmFjaykgLT5cbiAgICBsYXN0UG9zaXRpb24gPSBvZmZzZXQgKyBsZW5ndGhcbiAgICByZWFkZXIgPSBuZXcgRmlsZVJlYWRlclxuXG4gICAgcmVhZGVyLm9ubG9hZGVuZCA9IChwcm9ncmVzcykgLT5cbiAgICAgIGJ1ZmZlciA9IHVuZGVmaW5lZFxuICAgICAgaWYgcmVhZGVyLnJlc3VsdFxuICAgICAgICBidWZmZXIgPSBuZXcgSW50OEFycmF5KHJlYWRlci5yZXN1bHQsIDApXG4gICAgICAgIGJ1ZmZlci5zbGljZSA9IGJ1ZmZlci5zdWJhcnJheVxuICAgICAgY2FsbGJhY2sgcHJvZ3Jlc3MuZXJyLCBidWZmZXIsIHByb2dyZXNzLmxvYWRlZFxuICAgICAgcmV0dXJuXG5cbiAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIgZmlsZS5zbGljZShvZmZzZXQsIG9mZnNldCArIGxlbmd0aClcbiAgICByZXR1cm5cblxuXG5cbiAgIyBjYWxsYmFjayhzdHIpO1xuXG4gIGRlY29kZSA9IChidWZmZXIsIGNhbGxiYWNrKSAtPlxuICAgIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyXG5cbiAgICByZWFkZXIub25sb2FkZW5kID0gKHByb2dyZXNzKSAtPlxuICAgICAgY2FsbGJhY2sgcHJvZ3Jlc3MuY3VycmVudFRhcmdldC5yZXN1bHRcbiAgICAgIHJldHVyblxuXG4gICAgcmVhZGVyLnJlYWRBc1RleHQgbmV3IEJsb2IoWyBidWZmZXIgXSlcbiAgICByZXR1cm5cblxuICBuYXZpZ2F0b3IgPSBuZXcgTGluZU5hdmlnYXRvcihyZWFkQ2h1bmssIGRlY29kZSwgb3B0aW9ucylcblxuXG5cblxuICAjIFJldHVybnMgY3VycmVudCBtaWxlc3RvbmVzLCB0byBzcGVlZCB1cCBmaWxlIHJhbmRvbSByZWFkaW5nIGluIGZ1dHVyZVxuXG4gIHNlbGYuZ2V0TWlsZXN0b25lcyA9IG5hdmlnYXRvci5nZXRNaWxlc3RvbmVzXG5cblxuXG4gICMgUmVhZHMgb3B0aW1hbCBudW1iZXIgb2YgbGluZXNcbiAgIyBjYWxsYmFjazogZnVuY3Rpb24oZXJyLCBpbmRleCwgbGluZXMsIGVvZiwgcHJvZ3Jlc3MpXG4gICMgd2hlcmUgcHJvZ3Jlc3MgaXMgMC0xMDAgJSBvZiBmaWxlIFxuXG4gIHNlbGYucmVhZFNvbWVMaW5lcyA9IChpbmRleCwgY2FsbGJhY2spIC0+XG4gICAgbmF2aWdhdG9yLnJlYWRTb21lTGluZXMgaW5kZXgsIChlcnIsIGluZGV4LCBsaW5lcywgZW9mKSAtPlxuICAgICAgY2FsbGJhY2sgZXJyLCBpbmRleCwgbGluZXMsIGVvZiwgZ2V0UHJvZ3Jlc3MoKVxuICAgICAgcmV0dXJuXG4gICAgcmV0dXJuXG5cblxuXG4gICMgUmVhZHMgZXhhY3QgYW1vdW50IG9mIGxpbmVzXG4gICMgY2FsbGJhY2s6IGZ1bmN0aW9uKGVyciwgaW5kZXgsIGxpbmVzLCBlb2YsIHByb2dyZXNzKVxuICAjIHdoZXJlIHByb2dyZXNzIGlzIDAtMTAwICUgb2YgZmlsZSBcblxuICBzZWxmLnJlYWRMaW5lcyA9IChpbmRleCwgY291bnQsIGNhbGxiYWNrKSAtPlxuICAgIG5hdmlnYXRvci5yZWFkTGluZXMgaW5kZXgsIGNvdW50LCAoZXJyLCBpbmRleCwgbGluZXMsIGVvZikgLT5cbiAgICAgIGNhbGxiYWNrIGVyciwgaW5kZXgsIGxpbmVzLCBlb2YsIGdldFByb2dyZXNzKClcbiAgICAgIHJldHVyblxuICAgIHJldHVyblxuXG5cblxuICAjIEZpbmRzIG5leHQgb2NjdXJyZW5jZSBvZiByZWd1bGFyIGV4cHJlc3Npb24gc3RhcnRpbmcgZnJvbSBnaXZlbiBpbmRleFxuICAjIGNhbGxiYWNrOiBmdW5jdGlvbihlcnIsIGluZGV4LCBtYXRjaHtvZmZzZXQsIGxlbmd0aCwgbGluZX0pXG4gICMgb2Zmc2V0IGFuZCBsZW5ndGggYXJlIGJlbG9uZyB0byBtYXRjaCBpbnNpZGUgbGluZVxuXG4gIHNlbGYuZmluZCA9IG5hdmlnYXRvci5maW5kXG5cblxuXG4gICMgRmluZHMgYWxsIG9jY3VycmVuY2VzIG9mIHJlZ3VsYXIgZXhwcmVzc2lvbiBzdGFydGluZyBmcm9tIGdpdmVuIGluZGV4XG4gICMgY2FsbGJhY2s6IGZ1bmN0aW9uKGVyciwgaW5kZXgsIGxpbWl0SGl0LCByZXN1bHRzKVxuICAjIHJlc3VsdCBpcyBhbiBhcnJheSBvZiBvYmplY3RzIHdpdGggZm9sbG93aW5nIHN0cnVjdHVyZSB7aW5kZXgsIG9mZnNldCwgbGVuZ3RoLCBsaW5lfVxuICAjIG9mZnNldCBhbmQgbGVuZ3RoIGFyZSBiZWxvbmcgdG8gbWF0Y2ggaW5zaWRlIGxpbmVcblxuICBzZWxmLmZpbmRBbGwgPSBuYXZpZ2F0b3IuZmluZEFsbFxuXG5cbiAgIyBSZXR1cm5zIHNpemUgb2YgZmlsZSBpbiBieXRlc1xuICAjIGNhbGxiYWNrOiBmdW5jdGlvbihzaXplKVxuXG4gIHNlbGYuZ2V0U2l6ZSA9IChjYWxsYmFjaykgLT5cbiAgICBjYWxsYmFjayBpZiBmaWxlIHRoZW4gZmlsZS5zaXplIGVsc2UgMFxuXG4gIHJldHVyblxuXG5cbm1vZHVsZS5leHBvcnRzPUZpbGVOYXZpZ2F0b3JcbiIsIkZpbGVOYXZpZ2F0b3IgPSByZXF1aXJlICcuL2ZpbGVuYXZpZ2F0b3IuY29mZmVlJ1xuXG5cbnNob3dfcHJvZ3Jlc3MgPSAocHJvZ3Jlc3MsbnVtYmVyKSAtPlxuICBiYXI9JChcIi5wcm9ncmVzcy1iYXJcIilcbiAgYmFyLmNzcyBcIndpZHRoXCIsIFwiI3twcm9ncmVzc30lXCJcbiAgYmFyLnRleHQgXCIje3Byb2dyZXNzfSVcIlxuICAkKCcjY291bnRlcicpLnRleHQgbnVtYmVyXG4gIGNvbnNvbGUubG9nIFwiI3tudW1iZXJ9IDogbGluZXMgI3twcm9ncmVzc31cIlxuXG4jIEdsb2JhbHNcbmhvc3RzID0gXCJsb2NhbGhvc3Q6OTIwMFwiXG5pbmRleF9uYW1lID0gXCJnb3Z3aWtpXCJcbnR5cGVfbmFtZSA9IFwiZ292c1wiXG5lc19jbGllbnQgPSB1bmRlZmluZWRcbmZpZWxkX25hbWVzID0gW11cblxubmF2aWdhdG9yID0gdW5kZWZpbmVkXG5maWxlID0gdW5kZWZpbmVkXG5saW5lc19pbl9iYXRjaCA9MTAwMDBcbmluZGV4VG9TdGFydFdpdGggPSAwXG5vcHRpb25zID0ge2NodW5rU2l6ZTogMTAyNCAqIDEwMjQgKiAyfSAjIGNodW5rU2l6ZTogMTAyNCAqIDEwMjQgKiA0XG5jYXN0ID0gdW5kZWZpbmVkXG5cbmdldF9maWVsZF90eXBlcyA9KCkgLT5cbiAgc2VscyA9JCgnLnR5cGUtc2VsZWN0b3InKVxuICB0eXBlcyA9IChzZWwudmFsdWUgZm9yIHNlbCBpbiBzZWxzKVxuICByZXR1cm4gdHlwZXNcblxuXG5idWlsZF9oZWFkX3RhYmxlID0oKSAtPlxuICBjb250YWluZXIgPSAkKCcjaGVhZF90YWJsZV9jb250YWluZXInKVxuICBjb250YWluZXIuaHRtbCBcIlwiXG4gIGhlYWRfbmF2aWdhdG9yID0gbmV3IEZpbGVOYXZpZ2F0b3IgZmlsZSwgIHtjaHVua1NpemU6IDEwMjQgKiAxMjggfVxuICBoZWFkX25hdmlnYXRvci5yZWFkTGluZXMgMCwgMywgKGVyciwgaW5kZXgsIGxpbmVzLCBlb2YsIHByb2dyZXNzKSAtPlxuICAgIGlmIGVyciB0aGVuICByZXR1cm5cblxuICAgIGJ1aWxkX2ZpZWxkX25hbWVzX3JvdyA9IChsaW5lKSAtPlxuICAgICAgdGQgPSAobmFtZSkgLT4gXCI8dGg+I3tuYW1lLnJlcGxhY2UoL1wiL2csJycpfTwvdGg+XCJcbiAgICAgIG5hbWVzPSBsaW5lLnNwbGl0ICcsJ1xuICAgICAgKHRkKG5hbWUpIGZvciBuYW1lIGluIG5hbWVzKS5qb2luIFwiXCJcblxuICAgIFxuICAgIGJ1aWxkX2ZpZWxkX3R5cGVzX3JvdyA9IChsaW5lKSAtPlxuICAgICAgaWZfc3RyaW5nID0odikgLT5cbiAgICAgICAgaWYgbm90IHYgdGhlbiByZXR1cm4gXCJzZWxlY3RlZFwiXG4gICAgICAgIGlmICgnJyt2KS5pbmRleE9mKCdcIicpID4gLTEgdGhlbiByZXR1cm4gXCJzZWxlY3RlZFwiXG4gICAgICAgIFwiXCJcbiAgICAgIFxuICAgICAgaWZfbnVtYmVyID0odikgLT5cbiAgICAgICAgaWYgaWZfc3RyaW5nKHYpIGlzIFwic2VsZWN0ZWRcIiAgdGhlbiBcIlwiIGVsc2UgXCJzZWxlY3RlZFwiXG5cblxuICAgICAgdGQgPSAodikgLT5cbiAgICAgICAgXCJcIlwiXG4gICAgICAgIDx0ZD5cbiAgICAgICAgICA8c2VsZWN0IGNsYXNzPVwidHlwZS1zZWxlY3RvclwiPlxuICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cIlN0cmluZ1wiICN7aWZfc3RyaW5nKHYpfT5TdHJpbmc8L29wdGlvbj5cbiAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCJOdW1iZXJcIiAje2lmX251bWJlcih2KX0+TnVtYmVyPC9vcHRpb24+XG4gICAgICAgICAgICA8b3B0aW9uIHZhbHVlPVwiQm9vbGVhblwiPkJvb2xlYW48L29wdGlvbj5cbiAgICAgICAgICA8L3NlbGVjdD4gXG4gICAgICAgIDwvdGQ+XG4gICAgICAgIFwiXCJcIlxuICAgICAgdmFsdWVzID0gbGluZS5zcGxpdCAnLCdcbiAgICAgICh0ZCh2YWx1ZSkgZm9yIHZhbHVlIGluIHZhbHVlcykuam9pbiBcIlwiXG4gICAgXG5cbiAgICBidWlsZF9kYXRhX3JvdyA9IChsaW5lKSAtPlxuICAgICAgdGQgPSAodikgLT4gXCI8dGQ+I3t2fTwvdGQ+XCJcbiAgICAgIHZhbHVlcyA9IGxpbmUuc3BsaXQgJywnXG4gICAgICAodGQodmFsdWUpIGZvciB2YWx1ZSBpbiB2YWx1ZXMpLmpvaW4gXCJcIlxuICAgIFxuXG4gICAgcyA9IFwiXCJcIlxuICAgIDx0YWJsZSBzdHlsZT1cImJvcmRlcjoxcHggc29saWQgc2lsdmVyO1wiPlxuICAgICAgPHRoZWFkPlxuICAgICAgICA8dHI+I3tidWlsZF9maWVsZF9uYW1lc19yb3cobGluZXNbMF0pfTwvdHI+XG4gICAgICAgIDx0cj4je2J1aWxkX2ZpZWxkX3R5cGVzX3JvdyhsaW5lc1sxXSl9PC90cj5cbiAgICAgIDwvdGhlYWQ+XG4gICAgICA8dGJvZHk+XG4gICAgICAgIDx0cj4je2J1aWxkX2RhdGFfcm93KGxpbmVzWzFdKX08L3RyPlxuICAgICAgICA8dHI+I3tidWlsZF9kYXRhX3JvdyhsaW5lc1syXSl9PC90cj5cbiAgICAgIDwvdGJvZHk+XG4gICAgPC90YWJsZT5cbiAgICBcIlwiXCJcbiAgICBjb25zb2xlLmxvZyBzXG4gICAgY29udGFpbmVyLmh0bWwgc1xuICAgIHJldHVyblxuICByZXR1cm5cblxuXG5cbmluaXRfdWkgPSAtPlxuICBmaWxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Nob29zZUZpbGVCdXR0b24nKS5maWxlc1swXVxuICBzaG93X3Byb2dyZXNzIDAsMFxuICBidWlsZF9oZWFkX3RhYmxlKClcblxuICBcblxucHJlcGFyZV9qc29uID0oaW5kZXgsIGxpbmVzKSAtPlxuICBpZiBub3QgbGluZXMgdGhlbiByZXR1cm5cbiAgcmVzID0gW11cbiAgaWYgaW5kZXggaXMgMFxuICAgIGZpZWxkX25hbWVzID0gbGluZXNbMF0ucmVwbGFjZSgvXCIvZywnJykuc3BsaXQgJywnXG4gICAgbGluZXMuc2hpZnQoKVxuXG4gIGZvciBsaW5lLGkgaW4gbGluZXNcbiAgICBvcGVyYXRpb24gPSB7IGluZGV4OiAgeyBfaW5kZXg6IGluZGV4X25hbWUsIF90eXBlOiB0eXBlX25hbWUsIF9pZDogaW5kZXgraSB9IH1cbiAgICBmaWVsZF92YWx1ZXMgPSBsaW5lLnNwbGl0ICcsJ1xuICAgICNyZWNvcmQgPSBfLm9iamVjdCBmaWVsZF9uYW1lcywgZmllbGRfdmFsdWVzXG4gICAgcmVjb3JkID0gQ1NWLnBhcnNlKGxpbmUsIHtoZWFkZXI6IGZpZWxkX25hbWVzLCBjZWxsRGVsaW1pdGVyOicsJywgY2FzdDogY2FzdCB9KVswXVxuICAgIHJlcy5wdXNoIG9wZXJhdGlvblxuICAgIHJlcy5wdXNoIHJlY29yZFxuXG4gIHJldHVybiByZXNcbiAgXG5cbnNlbmRfdG9fc2VydmVyID0gKGluZGV4LCBsaW5lcywgZW9mLCBwcm9ncmVzcywganNvbikgLT5cbiAgI3NldFRpbWVvdXQgPT5cbiAgIyAgc2hvd19wcm9ncmVzcyhwcm9ncmVzcywgaW5kZXgrbGluZXMubGVuZ3RoKVxuICAjICBjb25zb2xlLmxvZyBcIiAje2xpbmVzLmxlbmd0aH0gbGluZXMgc2VudFwiXG4gICMgIFxuICAjICBpZiBlb2YgdGhlbiByZXR1cm5cbiAgIyAgIyBSZWFkaW5nIG5leHQgY2h1bmssIGFkZGluZyBudW1iZXIgb2YgbGluZXMgcmVhZCB0byBmaXJzdCBsaW5lIGluIGN1cnJlbnQgY2h1bmtcbiAgIyAgbmF2aWdhdG9yLnJlYWRMaW5lcyBpbmRleCArIGxpbmVzLmxlbmd0aCwgbGluZXNfaW5fYmF0Y2gsICBsaW5lc1JlYWRIYW5kbGVyXG4gICMgICNuYXZpZ2F0b3IucmVhZFNvbWVMaW5lcyBpbmRleCArIGxpbmVzLmxlbmd0aCwgIGxpbmVzUmVhZEhhbmRsZXJcbiAgIyAgcmV0dXJuXG4gICMsIDEwMDBcbiAgXG4gIGVzX2NsaWVudC5idWxrIHsgYm9keToganNvbiB9LCAoZXJyLCByZXNwKSA9PlxuICAgIGlmIGVyclxuICAgICAgYWxlcnQgXCJTb3JyeSwgI3tlcnIubWVzc2FnZX1cIlxuICAgICAgY29uc29sZS5sb2cgZXJyXG4gICAgICByZXR1cm5cbiAgICBlbHNlXG4gICAgICBzaG93X3Byb2dyZXNzKHByb2dyZXNzLCBpbmRleCtsaW5lcy5sZW5ndGgpXG4gICAgICBjb25zb2xlLmxvZyBcIiAje2xpbmVzLmxlbmd0aH0gbGluZXMgc2VudFwiXG4gICAgICBcbiAgICAgIGlmIGVvZiB0aGVuIHJldHVyblxuICAgICAgIyBSZWFkaW5nIG5leHQgY2h1bmssIGFkZGluZyBudW1iZXIgb2YgbGluZXMgcmVhZCB0byBmaXJzdCBsaW5lIGluIGN1cnJlbnQgY2h1bmtcbiAgICAgICNuYXZpZ2F0b3IucmVhZExpbmVzIGluZGV4ICsgbGluZXMubGVuZ3RoLCBsaW5lc19pbl9iYXRjaCwgIGxpbmVzUmVhZEhhbmRsZXJcbiAgICAgIG5hdmlnYXRvci5yZWFkU29tZUxpbmVzIGluZGV4ICsgbGluZXMubGVuZ3RoLCAgbGluZXNSZWFkSGFuZGxlclxuICAgICAgcmV0dXJuXG4gICAgcmV0dXJuXG5cbiAgcmV0dXJuXG5cblxucHJvY2Vzc19saW5lcyA9IChpbmRleCwgbGluZXMsIGVvZiwgcHJvZ3Jlc3MpIC0+XG5cbiAganNvbiA9IHByZXBhcmVfanNvbiBpbmRleCwgbGluZXNcbiAgc2VuZF90b19zZXJ2ZXIgaW5kZXgsIGxpbmVzLCBlb2YsIHByb2dyZXNzLCBqc29uXG5cbiAgXG5cbmxpbmVzUmVhZEhhbmRsZXIgPSAoZXJyLCBpbmRleCwgbGluZXMsIGVvZiwgcHJvZ3Jlc3MpIC0+XG4gIGlmIGVyciB0aGVuICByZXR1cm5cbiAgcHJvY2Vzc19saW5lcyBpbmRleCwgbGluZXMsIGVvZiwgcHJvZ3Jlc3NcbiAgcmV0dXJuXG5cbiAgXG5yZWFkRmlsZSA9IC0+XG4gIGhvc3RzID0gJCgnI2hvc3RzJykudmFsKClcbiAgaW5kZXhfbmFtZSA9ICQoJyNpbmRleE5hbWUnKS52YWwoKVxuICB0eXBlX25hbWUgPSAkKCcjdHlwZU5hbWUnKS52YWwoKVxuXG4gIGVzX2NsaWVudCA9IG5ldyAkLmVzLkNsaWVudCBob3N0czogaG9zdHNcbiAgXG4gIGNhc3QgPSBnZXRfZmllbGRfdHlwZXMoKVxuXG4gIG5hdmlnYXRvciA9IG5ldyBGaWxlTmF2aWdhdG9yKGZpbGUsIG9wdGlvbnMpXG4gICNuYXZpZ2F0b3IucmVhZExpbmVzIGluZGV4VG9TdGFydFdpdGgsIGxpbmVzX2luX2JhdGNoLCBsaW5lc1JlYWRIYW5kbGVyXG4gIG5hdmlnYXRvci5yZWFkU29tZUxpbmVzIGluZGV4VG9TdGFydFdpdGgsIGxpbmVzUmVhZEhhbmRsZXJcbiAgcmV0dXJuXG5cblxuJCgnI2Nob29zZUZpbGVCdXR0b24nKS5jaGFuZ2UgPT4gaW5pdF91aSgpXG4kKCcjcmVhZEZpbGVCdXR0b24nKS5jbGljayA9PiByZWFkRmlsZSgpXG5cblxuIl19
