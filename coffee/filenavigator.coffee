
# Allows to navigate given sources lines, saving milestones to optimize random reading
# options = {
#        milestones: [],         // optional: array of milestones, which can be obtained by getMilestones() method and stored to speed up random reading in future
#        chunkSize: 1024 * 4,    // optional: size of chunk to read at once
# }


FileNavigator = (file, options) ->
  self = this
  size = file.size
  file.navigator = this
  # reuse milestones later
  lastPosition = 0

  getProgress = ->
    if !size or size == 0
      return 0
    progress = parseInt(100 * lastPosition / size)
    if progress > 100 then 100 else progress



  # callback(err, buffer, bytesRead)

  readChunk = (offset, length, callback) ->
    lastPosition = offset + length
    reader = new FileReader

    reader.onloadend = (progress) ->
      buffer = undefined
      if reader.result
        buffer = new Int8Array(reader.result, 0)
        buffer.slice = buffer.subarray
      callback progress.err, buffer, progress.loaded
      return

    reader.readAsArrayBuffer file.slice(offset, offset + length)
    return



  # callback(str);

  decode = (buffer, callback) ->
    reader = new FileReader

    reader.onloadend = (progress) ->
      callback progress.currentTarget.result
      return

    reader.readAsText new Blob([ buffer ])
    return

  navigator = new LineNavigator(readChunk, decode, options)




  # Returns current milestones, to speed up file random reading in future

  self.getMilestones = navigator.getMilestones



  # Reads optimal number of lines
  # callback: function(err, index, lines, eof, progress)
  # where progress is 0-100 % of file 

  self.readSomeLines = (index, callback) ->
    navigator.readSomeLines index, (err, index, lines, eof) ->
      callback err, index, lines, eof, getProgress()
      return
    return



  # Reads exact amount of lines
  # callback: function(err, index, lines, eof, progress)
  # where progress is 0-100 % of file 

  self.readLines = (index, count, callback) ->
    navigator.readLines index, count, (err, index, lines, eof) ->
      callback err, index, lines, eof, getProgress()
      return
    return



  # Finds next occurrence of regular expression starting from given index
  # callback: function(err, index, match{offset, length, line})
  # offset and length are belong to match inside line

  self.find = navigator.find



  # Finds all occurrences of regular expression starting from given index
  # callback: function(err, index, limitHit, results)
  # result is an array of objects with following structure {index, offset, length, line}
  # offset and length are belong to match inside line

  self.findAll = navigator.findAll


  # Returns size of file in bytes
  # callback: function(size)

  self.getSize = (callback) ->
    callback if file then file.size else 0

  return


module.exports=FileNavigator
