FileNavigator = require './filenavigator.coffee'


show_progress = (progress,number) ->
  bar=$(".progress-bar")
  bar.css "width", "#{progress}%"
  bar.text "#{progress}%"
  $('#counter').text number
  console.log "#{number} : lines #{progress}"

# Globals
hosts = "localhost:9200"
index_name = "govwiki"
type_name = "govs"
es_client = undefined
field_names = []

navigator = undefined
file = undefined
lines_in_batch =5000
indexToStartWith = 0
options = {chunkSize: 1024 * 16} # chunkSize: 1024 * 1024 * 4


init_ui = ->
  file = document.getElementById('chooseFileButton').files[0]
  show_progress 0,0
  

prepare_json =(index, lines) ->
  if not lines then return
  res = []
  if index is 0
    field_names = lines[0].replace(/"/g,'').split ','
    lines.shift()

  for line,i in lines
    field_values = line.split ','
    #record = _.object field_names, field_values
    record = CSV.parse(line, {header: field_names, cellDelimiter:','})
    instruct = { index:  { _index: index_name, _type: type_name, _id: i } }
    res.push instruct
    res.push record

  return res
  

send_to_server = (index, lines, eof, progress, json) ->
  setTimeout =>
    show_progress(progress, index+lines.length)
    console.log " #{lines.length} lines sent"
    
    if eof then return
    # Reading next chunk, adding number of lines read to first line in current chunk
    navigator.readLines index + lines.length, lines_in_batch,  linesReadHandler
    #navigator.readSomeLines index + lines.length,  linesReadHandler
    return
  , 1000
  
  #es_client.bulk { body: json }, (err, resp) =>
  #  if err
  #    alert "Sorry, #{err.message}"
  #    console.log err
  #    return
  #  else
  #    show_progress(progress, index+lines.length)
  #    console.log " #{lines.length} lines sent"
  #    
  #    if eof then return
  #    # Reading next chunk, adding number of lines read to first line in current chunk
  #    navigator.readLines index + lines.length, lines_in_batch,  linesReadHandler
  #    #navigator.readSomeLines index + lines.length,  linesReadHandler
  #    return
  #  return

  return


process_lines = (index, lines, eof, progress) ->
  json = prepare_json index, lines
  send_to_server index, lines, eof, progress, json

  

linesReadHandler = (err, index, lines, eof, progress) ->
  if err then  return
  process_lines index, lines, eof, progress
  return

  
readFile = ->
  hosts = $('#hosts').val()
  index_name = $('#indexName').val()
  type_name = $('#typeName').val()

  es_client = new $.es.Client hosts: hosts
  
  navigator = new FileNavigator(file, options)
  navigator.readLines indexToStartWith, lines_in_batch, linesReadHandler
  #navigator.readSomeLines indexToStartWith, linesReadHandler
  return


$('#chooseFileButton').change => init_ui()
$('#readFileButton').click => readFile()


