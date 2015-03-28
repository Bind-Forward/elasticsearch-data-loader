FileNavigator = require './filenavigator.coffee'
# Globals
hosts = "localhost:9200"
index_name = "govwiki"
type_name = "govs"
es_client = undefined
field_names = []

navigator = undefined
file = undefined
lines_in_batch =10000
max_number_of_records=2000000000

options = {chunkSize: 1024 * 1024 * 2} # chunkSize: 1024 * 1024 * 4
cast = undefined

worker=undefined

# ==============================================================



show_progress = (progress,number) ->
  bar=$(".progress-bar")
  bar.css "width", "#{progress}%"
  bar.text "#{progress}%"
  $('#counter').text number
  console.log "#{number} : lines #{progress}%"



build_head_table2 =() ->
  container = $('#head_table_container')
  container.html ""
  head_navigator = new FileNavigator file,  {chunkSize: 1024 * 128 }
  head_navigator.readLines 0, 3, (err, index, lines, eof, progress) ->

    if err then  return
    
    build_id_radio = (name,i) ->
      """
      <input type="radio" name="id_field" value="#{name}">
      """

    build_type_selector = (name,i) ->
      
      if_string =(v) ->
        if not v then return "selected"
        if (''+v).indexOf('"') > -1 then return "selected"
        ""
      
      if_number =(v) ->
        if if_string(v) is "selected"  then "" else "selected"
      
      v = lines[1].split(',')[i]
      """
      <select class="type-selector form-control" style="width:100px;">
        <option value="String" #{if_string(v)}>String</option>
        <option value="Number" #{if_number(v)}>Number</option>
        <option value="Boolean">Boolean</option>
      </select> 
      """

    build_table_row = (name,i) ->
      """
      <tr>
        <td class="first-column">#{build_id_radio(name,i)}</td>
        <td>#{name}</td>
        <td style="width:120px;">#{build_type_selector(name,i)}</td>
        <td>#{lines[1].split(',')[i]}</td>
      </tr>
      """
    

    build_table_body = ->
      (build_table_row(name,i) for name, i in lines[0].replace(/"/g,'').split(','))
      .join('')
    
    
    s = """
    <table class="table table-condensed">
      <thead>
        <tr>
          <th class="first-column" style="width:70px;"><input type="radio" name="id_field" value="" checked>&nbsp;_id</th>
          <th style="width:250px;">name</th>
          <th style="width:120px;">type</th>
          <th>sample</th>
        </tr>
      </thead>
      <tbody>
        #{build_table_body()}
      </tbody>
    </table>
    """

    container.html s
    return


  return

# prepare GUI after the user selects a file
init_ui = ->
  file = document.getElementById('chooseFileButton').files[0]
  clear worker
  show_progress 0,0
  build_head_table2()
  $('.step-3').show()
  $('.step-4').hide()

  
# converts text to JSON. Processor consuming operation. TODO: move to a worker.
# prm is { index:index, lines:lines, field_names:field_names, 
# max_number_of_records:max_number_of_records, index_name:index_name, type_name:type_name, cast:cast }
convert_lines_to_json2 =(prm) ->
  importScripts('../js/csv.js')
  if not prm.lines then return
  res = []
  if prm.index is 0
    prm.field_names = prm.lines[0].replace(/"/g,'').split ','
    prm.lines.shift()

  for line,i in prm.lines
    if prm.index+i > prm.max_number_of_records then return res
    operation = { index:  { _index: prm.index_name, _type: prm.type_name, _id: prm.index+i } }
    field_values = line.split ','
    #record = _.object field_names, field_values
    record = CSV.parse(line, {header: prm.field_names, cellDelimiter:',', cast: prm.cast })[0]
    res.push operation
    res.push record

  return res



# Reading next chunk
read_lines2 =(i) ->
  status 'reading text'
  #navigator.readLines i, lines_in_batch,  linesReadHandler
  navigator.readSomeLines i,  linesReadHandler2
  return


send_json_to_server2 = (index, lines, eof, progress, json) ->
  if index>max_number_of_records
    return
  if json.length is 0
    return

  status "#{json.length/2} sending"
  es_client.bulk { body: json }, (err, resp) =>

    if err
      clear worker
      alert "Sorry, #{err.message}"
      console.log err
      return
    else
      status ""
      show_progress(progress, index+json.length/2) # lines.length)
      #console.log " #{json.length/2} lines sent"
      
      if eof
        clear worker
        return
      # adding number of lines read to first line in current chunk
      read_lines2 index + json.length/2 #lines.length
      return
    return

  return



  
# works when a next portion of file has been read
linesReadHandler2 = (err, index, lines, eof, progress) ->
  if err
    clear worker
    return
        
  if index>max_number_of_records
    clear worker
    return
  
  status "#{lines.length} converting"
  worker.convert_lines_to_json2({
    index:index,
    lines:lines,
    field_names:field_names,
    max_number_of_records:max_number_of_records,
    index_name:index_name,
    type_name:type_name,
    cast:cast
  })
  .then (json) ->
    send_json_to_server2 index, lines, eof, progress, json
    return

  return

clear =(worker)->
  if worker
    worker.close()



# returns array of feild types to save in the global cast variable
get_field_types =() ->
  sels =$('.type-selector')
  types = (sel.value for sel in sels)
  return types



# starts actually read the file  
readFile = ->
  clear worker
  worker = cw convert_lines_to_json2: convert_lines_to_json2

  hosts = $('#hosts').val()
  index_name = $('#indexName').val()
  type_name = $('#typeName').val()

  es_client = new $.es.Client hosts: hosts
  
  cast = get_field_types()

  navigator = new FileNavigator(file, options)
  read_lines2 0
  
  $('.step-4').show()
  return

status =(text) ->
  $('#status').text(text)

# assign handlers to UI 
$('#chooseFileButton').change => init_ui()
$('#readFileButton').click => readFile()

$('.step-3').hide()
$('.step-4').hide()


