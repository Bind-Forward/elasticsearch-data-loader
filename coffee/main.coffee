FileNavigator = require './filenavigator.coffee'


show_progress = (p,n) ->
  bar=$(".progress-bar")
  bar.css "width", "#{p}%"
  bar.text "#{p}%"
  $('#counter').text n


window.readFile = ->

  lines_in_batch =5000

  file = document.getElementById('input00').files[0]
  navigator = new FileNavigator(file, chunkSize: 1024 * 16 ) # chunkSize: 1024 * 1024 * 4
  indexToStartWith = 0
  # starting from beginning

  linesReadHandler = (err, index, lines, eof, progress) ->
    
    # Error happened
    if err
      return
    
    # Reading lines
    i = 0
    while i < lines.length
      lineIndex = index + i
      line = lines[i]
      # Do something with line
      #console.log(lineIndex+": "+line);
      i++
    
    console.log "#{lineIndex+1} : lines #{progress}"
    show_progress(progress, lineIndex+1)

    # End of file
    if eof
      console.log lineIndex + 1 + ' lines were read'
      show_progress(progress, lineIndex+1)
      return
    
    # Reading next chunk, adding number of lines read to first line in current chunk
    navigator.readLines index + lines.length, lines_in_batch,  linesReadHandler
    #navigator.readSomeLines index + lines.length,  linesReadHandler
    return


  navigator.readLines indexToStartWith, lines_in_batch, linesReadHandler
  #navigator.readSomeLines indexToStartWith, linesReadHandler
  return
