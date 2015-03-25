FileNavigator = require './filenavigator.coffee'


show_progress = (progress,number) ->
  bar=$(".progress-bar")
  bar.css "width", "#{progress}%"
  bar.text "#{progress}%"
  $('#counter').text number
  console.log "#{number} : lines #{progress}"

# Globals
url = "http://localhost:9200/"
index = "govwiki"
type = "govs"
navigator = undefined
file = undefined
lines_in_batch =5000
indexToStartWith = 0
options = {chunkSize: 1024 * 16} # chunkSize: 1024 * 1024 * 4


init_ui = ->
  file = document.getElementById('chooseFileButton').files[0]
  show_progress 0,0
  

prepare_json =(index, lines) ->
  return ["some","json"]
  

send_to_server = (index, lines, eof, progress, json) ->
  setTimeout =>
    show_progress(progress, index+lines.length)
    console.log "sended json: #{json}"
    if eof then return
    # Reading next chunk, adding number of lines read to first line in current chunk
    navigator.readLines index + lines.length, lines_in_batch,  linesReadHandler
    #navigator.readSomeLines index + lines.length,  linesReadHandler
    return
  , 1000



process_lines = (index, lines, eof, progress) ->
  json = prepare_json index, lines
  send_to_server index, lines, eof, progress, json

  

linesReadHandler = (err, index, lines, eof, progress) ->
  if err then  return
  process_lines index, lines, eof, progress
  return

  
readFile = ->
  navigator = new FileNavigator(file, options)
  navigator.readLines indexToStartWith, lines_in_batch, linesReadHandler
  #navigator.readSomeLines indexToStartWith, linesReadHandler
  return


$('#chooseFileButton').change => init_ui()
$('#readFileButton').click => readFile()


