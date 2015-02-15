!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.diffmergepatch=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

var _ = require('underscore')

function Result(diff) {
  this.diff = diff.diff
}

var diff = function(before, after) {
  after = _.clone(after)
  var result = {}
  _.each(before, function(value, key) {
    var afterValue = after[key]
    if(afterValue === undefined) return result[key] = {value: null}
    if(value != afterValue) {
      result[key] = {value: afterValue}
    }
    delete after[key]
  })
  _.each(after, function(value, key) {
    result[key] = {value: value}
  })
  return new Result({diff: result})
}

diff.Result = Result
module.exports = diff
},{"underscore":38}],2:[function(require,module,exports){

module.exports = {
  diff: require('./diff'),
  merge: require('./merge'),
  resolve: require('./resolve'),
  patch: require('./patch')
}
},{"./diff":1,"./merge":3,"./patch":4,"./resolve":5}],3:[function(require,module,exports){

var _ = require('underscore')

function Result(data) {
  this.diff = data.diff
  if (data.conflict && data.conflict.length) this.conflict = data.conflict
}

var compareBySourceLengthAndValue = function(a, b) {
  if (a.source.length > b.source.length) {
    return true
  } else if (a.source.length < b.source.length) {
    return false
  } else {
    return a.value > b.value
  }
}

var merge = function(diffs) {
  var result = {}
  var conflicts = []
  var setValue = function(source) { return function(entry, key) {
    if (result[key] === undefined) {
      result[key] = {value: entry.value, source: [source]}
    } else {
      if (result[key].constructor != Array) {
        result[key] = [result[key]]
      }
      var existing = _.find(result[key], function(each) { return each.value === entry.value })
      if (existing) {
        existing.source.push(source)
      } else {
        result[key].push({value: entry.value, source: [source]})
        conflicts.push(key)
      }
    }
  }}
  diffs.forEach(function(eachDiff, i) {
    _.each(eachDiff.diff, setValue(i))
  })
  _.each(result, function(entries, key) { if (entries.length == 1) result[key] = entries[0] })

  return new Result({diff: result, conflict: conflicts})
}

merge.Result = Result

module.exports = merge
},{"underscore":38}],4:[function(require,module,exports){

var _ = require('underscore')

var patch = function(object, diff) {
  if (diff.conflict) throw new Error("resolve conflicts")
  var result = _.clone(object)
  _.each(diff.diff, function(entry, key) {
    if (entry.value === null) {
      delete result[key]
    } else {
      result[key] = entry.value
    }
  })
  return result
}

module.exports = patch
},{"underscore":38}],5:[function(require,module,exports){

var _ = require('underscore')

var resolve = function(diff, winner) {
  if (!diff.conflict) return diff

  var result = _.clone(diff.diff)
  diff.conflict.forEach(function(each) {
    result[each] = result[each][winner]
  })

  return {diff: result}
}

module.exports = resolve
},{"underscore":38}],6:[function(require,module,exports){

module.exports = {
  set: require('./set/index'),
  dictionary: require('./dictionary/index'),
  orderedList: require('./ordered-list/index'),
  orderedSet: require('./ordered-set/index')
}

},{"./dictionary/index":2,"./ordered-list/index":8,"./ordered-set/index":12,"./set/index":17}],7:[function(require,module,exports){


var _ = require('underscore')
var longestCommonSubstring = require('longest-common-substring')

function Insert(value, indexBefore, indexAfter) {
  this.op = '+'
  this.values = value
  this.indexBefore = indexBefore
  this.indexAfter = indexAfter
}
function Delete(length, indexBefore, indexAfter) {
  this.op = '-'
  this.length = length
  this.indexBefore = indexBefore
  this.indexAfter = indexAfter
}

var diff = function(before, after, startBefore, startAfter) {
  startBefore = startBefore || 0
  startAfter = startAfter || 0

  var commonSeq = longestCommonSubstring(before, after)
  var endBeforeLeft = commonSeq.startString1
  var endAfterLeft = commonSeq.startString2
  var startBeforeRight = endBeforeLeft + commonSeq.length
  var startAfterRight = endAfterLeft + commonSeq.length

  if (commonSeq.length == 0) {
    var result = []
    if (before.length) result.push(new Delete(before.length, startBefore - 1, startAfter - 1))
    if (after.length) result.push(new Insert(after, startBefore + before.length - 1, startAfter - 1))
    return result
  }

  var beforeLeft = before.slice(0, endBeforeLeft)
  var afterLeft = after.slice(0, endAfterLeft)
  var beforeRight = before.slice(startBeforeRight)
  var afterRight = after.slice(startAfterRight)

  return _.union(
    diff(beforeLeft, afterLeft, startBefore, startAfter),
    diff(beforeRight, afterRight, startBefore + startBeforeRight, startAfter + startAfterRight)
  )
}

module.exports = diff
},{"longest-common-substring":37,"underscore":38}],8:[function(require,module,exports){

module.exports = {
  diff: require('./diff'),
  merge: require('./merge'),
  patch: require('./patch')
}
},{"./diff":7,"./merge":9,"./patch":10}],9:[function(require,module,exports){

var _ = require('underscore')

var mapSources = function(diffs) {
  return diffs.map(function(eachDiff, source) {
    return eachDiff.map(function(each) {
      var each = _.clone(each)
      delete each.indexAfter
      each.source = [source]
      return each
    })
  })
}

var findMinimum = function(items, iterator) {
  var min = null
  var indexes = []
  items.forEach(function(each, i) {
    var value = iterator(each)
    if (!value) return
    if ((min === null) || (value <= min)) {
      if (value < min) indexes = []
      min = value
      indexes.push(i)
    }
  })
  return {value: min, indexes: indexes}
}

var compareArrays = function(array1, array2) {
  if (array1.length == 0) {
    return -1
  } else if (array2.length == 0) {
    return 1
  } else if ((array1.length == 0) && (array2.length == 0)) {
    return 0
  }
  var val1 = array1[0]
  var val2 = array2[0]
  if (val1 < val2) {
    return -1
  } else if (val1 > val2) {
    return 1
  } else {
    if (array1.length && array2.length) {
      return compareArrays(array1.slice(1), array2.slice(1))
    } else if (array2.length) {
      return -1
    } else if (array2.length) {
      return 1
    } else {
      return 0
    }
  }
}

var isSameArray = function(array1, array2) {
  return (_.difference(array1, array2).length == 0) && (_.difference(array2, array1).length == 0)
}

var splitDelete = function(update) {
  var first = _.clone(update)
  var rest = _.clone(update)
  first.length = 1
  rest.indexBefore++
  rest.length--
  return {first: first, rest: rest}
}

var joinDeletesWithSameIndex = function(diff) {
  if (diff.length == 0) return []
  if (diff.length == 1) return diff
  var first = _.clone(diff[0])
  var next = _.clone(diff[1])
  var rest = diff.slice(2)
  if ((first.op == '-') && (next.op == '-') && (first.indexBefore == next.indexBefore)) {
    first.source = first.source.concat(next.source)
    return [first].concat(joinDeletesWithSameIndex(rest))
  }
  return [first].concat(joinDeletesWithSameIndex([next].concat(rest)))
}

var joinNeighbourDeletes = function(diff) {
  if (diff.length == 0) return []
  if (diff.length == 1) return diff
  var first = _.clone(diff[0])
  var next = _.clone(diff[1])
  var rest = diff.slice(2)
  if ((first.op == '-') && (next.op == '-')) {
    var areSameSources = isSameArray(first.source, next.source)
    var areNeighbours = (first.indexBefore + first.length) == next.indexBefore
    if (areSameSources && areNeighbours) {
      first.length++
      return [first].concat(joinNeighbourDeletes(rest))
    }
  }
  return [first].concat(joinNeighbourDeletes([next].concat(rest)))
}

var merge = function(diffs) {
  var mergedDiff = []
  diffs = mapSources(diffs)

  while (_.any(diffs, function(each) { return each.length })) {
    var min = findMinimum(diffs, function(each) { if (each.length) return each[0].indexBefore })
    var minUpdates = min.indexes.map(function(i) {
      var update = diffs[i].shift()
      if ((update.op == '-') && (update.length > 1)) {
        var splitUpdate = splitDelete(update)
        update = splitUpdate.first
        diffs[i].unshift(splitUpdate.rest)
      }
      return update
    })
    minUpdates.sort(function(a, b) { return compareArrays(a.values || [], b.values || []) })
    mergedDiff = mergedDiff.concat(minUpdates)
  }

  return joinNeighbourDeletes(joinDeletesWithSameIndex(mergedDiff))
}

module.exports = merge

},{"underscore":38}],10:[function(require,module,exports){

var _ = require('underscore')

var patch = function(before, diff) {
  var result = _.clone(before)
  var prefix = []
  var insertValues = function(index, values) {
    if (index == -1) {
      prefix = prefix.concat(values)
    } else {
      if (result[index].constructor != Array) result[index] = [result[index]]
      result[index] = result[index].concat(values)      
    }
  }
  var deleteIndex = function(index) {
    if (result[index].constructor != Array) result[index] = [result[index]]
    result[index] = result[index].slice(1)
  }

  diff.forEach(function(each) {
    if (each.op == '+') {
      insertValues(each.indexBefore, each.values)
    } else if (each.op == '-') {
      _.times(each.length, function(i) { deleteIndex(each.indexBefore + i + 1) })
    }
  })

  return prefix.concat(_.flatten(result))
}

module.exports = patch
},{"underscore":38}],11:[function(require,module,exports){

var _ = require('underscore')
//var listDiff = require('../ordered-list/index').diff
var listDiff = require('diff-merge-patch').orderedList.diff

function ArrayDiff() {
  this.diff = []
}

ArrayDiff.prototype.newIndex = function(index) {
  var array = _.find(this.diff, function(each) { return each[0] == index })
  if (!array) {
    array = [index, []]
    this.diff.push(array)
  }
  return array[1]
}

ArrayDiff.prototype.addMove = function(newIndex, oldIndex) {
  var entries = this.newIndex(newIndex)
  entries.push({move: oldIndex})
}

ArrayDiff.prototype.addInsert = function(newIndex, value) {
  var entries = this.newIndex(newIndex)
  entries.push({insert: value})
}

ArrayDiff.prototype.addDelete = function(oldIndex) { this.addMove(null, oldIndex) }

var orderedSetDiff = function(before, after) {
  var diffRes = listDiff(before, after)
  var result = new ArrayDiff()
  
  var cutValues = {}
  // find all deletes who are actually moved/cut values:
  if (diffRes.delete) diffRes.delete.forEach(function(each) {
    var index = each.index
    if (_.contains(after, before[index])) {
      cutValues[before[index]] = index
    } else {
      result.addDelete(index)
    }
  })
  // find out which inserts are actually moved values:
  if (diffRes.insert) diffRes.insert.forEach(function(each) {
    each[1][0].values.forEach(function(value, i) {
      var currentCutIndex = cutValues[value]
      if (currentCutIndex === undefined) {
        result.addInsert(each[0], value)
      } else {
        result.addMove(each[0], currentCutIndex)
      }
    })
  })
  return result
}

module.exports = orderedSetDiff

},{"diff-merge-patch":24,"underscore":38}],12:[function(require,module,exports){

module.exports = {
  diff: require('./diff'),
  merge: require('./merge'),
  patch: require('./patch'),
  resolve: require('./resolve')
}
},{"./diff":11,"./merge":13,"./patch":14,"./resolve":15}],13:[function(require,module,exports){

var _ = require('underscore')
var dictionaryMerge = require('../dictionary/index').merge
var arrayDiff = require('./diff')

function Result(diff, conflicts) {
  this.diff = diff
  if (conflicts) this.conflict = conflicts
}

function Conflicts(values) {
  this._nextID = 1
  this.map = {}
  if (values) values.forEach(this.addConflict, this)
}

Conflicts.prototype.addConflict = function(value) {
  this.map[value] = this.nextID()
}

Conflicts.prototype.conflictID = function(value) {
  return this.map[value]
}

Conflicts.prototype.nextID = function() {
  return this._nextID++
}


var addSources = function(diff, i) {
  return diff.diff.map(function(each) {
    var entries = each[1].map(function(entry) {
      var updatedEntry = _.clone(entry)
      updatedEntry.source = [i]
      return updatedEntry
    })
    return [each[0], entries]
  })
}

var oldToNewIndexMap = function(diff, i) {
  var map = {}
  diff.forEach(function(each) {
    each[1].forEach(function(entry) {
      if (entry.move !== undefined) map[entry.move] = {value: each[0], source: [i]}
    })
  })
  return {diff: map}
}

var markIndexConflicts = function(conflicts) { return function(diff) {
  return diff.map(function(each) {
    var updates = each[1].map(function(update) {
      if (update.move) {
        var conflict = conflicts.conflictID(update.move)
        if (conflict) update.conflict = conflict
      }
      return update
    })
    return [each[0], updates]
  })
}}

var sortByNewIndexDesc = function(diff) {
  return diff.sort(function(a, b) { return a[0] < b[0] })
}

var union = function(diff1, diff2, opts) {
  var result = []
  while(diff1.length && diff2.length) {
    var entries = [diff1, diff2].map(function(each) { return each.pop() })
    var newIndexes = entries.map(function(each) { return each[0] })
    if (newIndexes[0] == newIndexes[1]) {
      result.push([ entries[0][0], opts.onUpdatesAtSameIndex(entries[0][1], entries[1][1]) ])
    } else if ((!entries[0]) || (newIndexes[0] > newIndexes[1])) {
      if (entries[0]) diff1.push(entries[0])
      result.push(entries[1])
    } else {
      if (entries[1]) diff2.push(entries[1])
      result.push(entries[0])
    }
  }
  return result.concat(diff1, diff2)
}

var serializeUpdate = function(update) {
  return update.insert !== undefined ? JSON.stringify({i: update.insert}) : update.move
}

var mergeEntry = function(updates1, updates2, conflicts) {
  var updates2Map = {}
  var arrays = [updates1, updates2].map(function(each) {
    return each.map(function(update) {
      var serialized = update.insert !== undefined ? 'i'+update.insert : update.move
      updates2Map[serialized] = update
      return serialized
    })
  })

  var updateDiff = arrayDiff(arrays[0], arrays[1])

  var result = updates1.map(function(each) {
    each.source = [0, 1]
    return [each]
  })
  updateDiff.diff.forEach(function(each) {
    var index2 = each[0]
    each[1].forEach(function(diffEntry) {
      if (index2 === null) {
        var update1 = updates1[diffEntry.move]
        update1.source = [0]
      } else if (diffEntry.insert !== undefined) {
        var update2 = updates2Map[diffEntry.insert]
        update2.source = [1]
        if (update2.move !== undefined) {
          var conflictID = conflicts.conflictID(update2.move)
          if (conflictID) update2.conflict = conflictID
        }
        result[index2].push(update2)
      } else if (diffEntry.move !== undefined) {
        var update1 = updates1[diffEntry.move]
        var update2 = updates2Map[diffEntry.move]
        var existingConflict = update1.move !== undefined ? conflicts.conflictID(update1.move) : undefined
        var conflictID = existingConflict ? existingConflict : conflicts.nextID()
        [update1, update2].forEach(function(each, i) {
          each.conflict = conflictID
          each.source = [i]
        })
        result[index2].push(update2)
      }
    })
  })

  return _.flatten(result)
}

var merge = function(diffs) {
  var diffs = diffs.map(addSources)

  // find all conflicts caused by moving the same object to different positions
  var moveMaps = diffs.map(oldToNewIndexMap)
  var conflicts = new Conflicts(dictionaryMerge(moveMaps).conflict)
  diffs = diffs.map(markIndexConflicts(conflicts))

  // find all sequence conflicts for updates at the same origin position
  diffs = diffs.map(sortByNewIndexDesc)
  var diffUnion = union(diffs[0], diffs[1], {
    onUpdatesAtSameIndex: function(updates1, updates2) {
      return mergeEntry(updates1, updates2, conflicts)
    }
  })

  return new Result(diffUnion, conflicts._nextID - 1)
}

merge.Result = Result
module.exports = merge

},{"../dictionary/index":2,"./diff":11,"underscore":38}],14:[function(require,module,exports){

var _ = require('underscore')

var patch = function(before, diff) {
  if (diff.conflict) throw new Error("resolve conflicts")
  
  var result = before.map(function(each) { return [each] })
  var prefix = []
  var insertValue = function(value, index) {
    index == -1 ? prefix.push(value) : result[index].push(value)
  }

  diff.diff.forEach(function(each) {
    var newIndex = each[0], updates = each[1]
    updates.forEach(function(update) {
      if (newIndex == null) {
        result[update.move][0] = null
      } else if (update.insert != undefined) {
        insertValue(update.insert, newIndex)
      } else if (update.move != undefined) {
        insertValue(before[update.move], newIndex)
        result[update.move][0] = null
      }
    })
  })
  return prefix.concat(_.without(_.flatten(result), null))
}

module.exports = patch
},{"underscore":38}],15:[function(require,module,exports){

var _ = require('underscore')

var resolve = function(diff, winner) {
  var resolved = []
  diff.diff.forEach(function(each) {
    var updates = []
    each[1].forEach(function(update) {
      if (update.conflict) {
        if (update.source[0] == winner) {
          update = _.clone(update)
          delete update.conflict
          updates.push(update)
        }
      } else {
        updates.push(update)
      }
    })
    if (updates.length) resolved.push([each[0], updates])
  })
  return {diff: resolved}
}

module.exports = resolve
},{"underscore":38}],16:[function(require,module,exports){

var _ = require('underscore')

var compareByValue = function(a, b) {
  var values = [a, b].map(function(each) { return each.insert !== undefined ? each.insert : each.delete })
  return values[0] > values[1]
}

function Result(diff) {
  this.diff = diff.sort(compareByValue)
}

var diff = function(before, after) {
  before = _.clone(before).sort()
  after = _.clone(after).sort()
  var result = []
  var afterIndex = 0
  before.forEach(function(each, i) {
    while(each > after[afterIndex]) {
      result.push({insert: after[afterIndex]})
      afterIndex++
    }
    if (each == after[afterIndex]) {
      afterIndex++
    } else {
      result.push({delete: each})
    }
  })
  var rest = after.slice(afterIndex).map(function(each) { return {insert: each} })
  return new Result(result.concat(rest))
}

diff.Result = Result

module.exports = diff

},{"underscore":38}],17:[function(require,module,exports){
arguments[4][8][0].apply(exports,arguments)
},{"./diff":16,"./merge":18,"./patch":19,"dup":8}],18:[function(require,module,exports){

var _ = require('underscore')

function Result(diff) {
  this.diff = diff
}

var merge = function(diffs) {
  diffs = diffs.map(function(each) { return _.clone(each.diff) })
  var result = []

  while (_.any(diffs, function(diff) { return diff.length })) {
    var diffsWithUpdates = diffs.filter(function(each) { return each.length })
    var modifier
    var smallestValue = null
    diffsWithUpdates.forEach(function(diff) {
      ['insert', 'delete'].forEach(function(eachModifier) {
        if (diff[0][eachModifier] != undefined) {
          if ((smallestValue == null) || (diff[0][eachModifier] < smallestValue)) {
            smallestValue = diff[0][eachModifier]
            modifier = eachModifier
          }
        }
      })
    })

    var sources = []
    diffs.forEach(function(diff, i) {
      if (diff.length && (diff[0][modifier] == smallestValue)) {
        sources.push(i)
        diff.shift()
      }
    })
    
    var update = {source: sources}
    update[modifier] = smallestValue
    result.push(update)
  }
  
  return new Result(result)
}

module.exports = merge
},{"underscore":38}],19:[function(require,module,exports){

var _ = require('underscore')

var patch = function(collection, diff) {
  var deletes = []
  var inserts = []
  diff.diff.forEach(function(each) {
    each.insert != undefined ? inserts.push(each.insert) : deletes.push(each.delete)
  })
  return _.difference(collection, deletes).concat(inserts)
}

module.exports = patch
},{"underscore":38}],20:[function(require,module,exports){
arguments[4][1][0].apply(exports,arguments)
},{"dup":1,"underscore":38}],21:[function(require,module,exports){
arguments[4][8][0].apply(exports,arguments)
},{"./diff":20,"./merge":22,"./patch":23,"dup":8}],22:[function(require,module,exports){

var _ = require('underscore')

function Result(data) {
  this.diff = data.diff
  if (data.conflict && data.conflict.length) this.conflict = data.conflict
}

var compareBySourceLengthAndValue = function(a, b) {
  if (a.source.length > b.source.length) {
    return true
  } else if (a.source.length < b.source.length) {
    return false
  } else {
    return a.value > b.value
  }
}

Result.prototype.resolveConflicts = function() {
  var result = this.diff
  this.conflict.forEach(function(conflictKey) {
    var values = result[conflictKey]
    result[conflictKey] = _.without(values, null).sort(compareBySourceLengthAndValue)[0]
  })
  return new Result({diff: result})
}

var merge = function(diffs) {
  var result = {}
  var conflicts = []
  var setValue = function(source) { return function(entry, key) {
    if (result[key] === undefined) {
      result[key] = {value: entry.value, source: [source]}
    } else {
      if (result[key].constructor != Array) {
        result[key] = [result[key]]
      }
      var existing = _.find(result[key], function(each) { return each.value === entry.value })
      if (existing) {
        existing.source.push(source)
      } else {
        result[key].push({value: entry.value, source: [source]})
        conflicts.push(key)
      }
    }
  }}
  diffs.forEach(function(eachDiff, i) {
    _.each(eachDiff.diff, setValue(i))
  })
  _.each(result, function(entries, key) { if (entries.length == 1) result[key] = entries[0] })

  return new Result({diff: result, conflict: conflicts})
}

merge.Result = Result

module.exports = merge
},{"underscore":38}],23:[function(require,module,exports){
arguments[4][4][0].apply(exports,arguments)
},{"dup":4,"underscore":38}],24:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"./dictionary/index":21,"./ordered-list/index":26,"./ordered-set/index":30,"./set/index":34,"dup":6}],25:[function(require,module,exports){


var _ = require('underscore')
var longestCommonSubstring = require('longest-common-substring')

function Insert(value) {
  this.insert = value
}
function Equal(count) {
  this.equal = count
}
function Delete(count) {
  this.delete = count
}

var diff = function(before, after) {
  var commonSeq = longestCommonSubstring(before, after)
  var startBefore = commonSeq.startString1
  var startAfter = commonSeq.startString2
  if (commonSeq.length == 0) {
    var result = []
    if (before.length) result.push(new Delete(before.length))
    if (after.length) result.push(new Insert(after))
    return result
  }
  var beforeLeft = before.slice(0, startBefore)
  var afterLeft = after.slice(0, startAfter)
  var equal = [new Equal(commonSeq.length)]
  var beforeRight = before.slice(startBefore + commonSeq.length)
  var afterRight = after.slice(startAfter + commonSeq.length)
  return _.union(diff(beforeLeft, afterLeft), equal, diff(beforeRight, afterRight))
}

var compress = function(diff) {
  var inserts = []
  var deletes = []
  var originIndex = 0
  diff.forEach(function(each) {
    switch (each.constructor) {
      case Equal:
        originIndex += each.equal
        break;
      case Insert:
        inserts.push([originIndex-1, [{values: each.insert}]])
        break;
      case Delete:
        _.times(each.delete, function(i) {
          deletes.push({index: originIndex + i})
        })
        originIndex += each.delete
    }
  })
  var result = {}
  if (inserts.length) result.insert = inserts
  if (deletes.length) result.delete = deletes
  return result
}

module.exports = function(before, after) {
  return compress(diff(before, after))
}
},{"longest-common-substring":37,"underscore":38}],26:[function(require,module,exports){
arguments[4][8][0].apply(exports,arguments)
},{"./diff":25,"./merge":27,"./patch":28,"dup":8}],27:[function(require,module,exports){

var _ = require('underscore')

var findMinimum = function(arrays, iterator) {
  var min = null
  var sources
  arrays.forEach(function(each, i) {
    if (each.length) {
      if ((min == null) || (iterator(each) < min)) {
        min = iterator(each)
        sources = [i]
      } else if (iterator(each) == min) {
        sources.push(i)
      }
    }
  })
  return {value: min, sources: sources}
}

var merge = function(diffs) {
  var inserts = []
  var deletes = []
  var diffsInserts = diffs.map(function(each) { return each.insert ? _.clone(each.insert) : [] })
  while (_.any(diffsInserts, function(each) { return each.length })) {
    var smallestIndex = findMinimum(diffsInserts, function(each) { return each[0][0] })

    var updates = [smallestIndex.value, []]
    smallestIndex.sources.forEach(function(i) {
      var update = _.clone(diffsInserts[i][0][1][0])
      update.source = i
      updates[1].push(update)
      diffsInserts[i].shift()
    })

    inserts.push(updates)    
  }

  var diffsDeletes = diffs.map(function(each) { return each.delete ? _.clone(each.delete) : [] })
  while (_.any(diffsDeletes, function(each) { return each.length })) {
    var smallestIndex = findMinimum(diffsDeletes, function(each) { return each[0].index })
    
    smallestIndex.sources.forEach(function(i) { diffsDeletes[i].shift() })

    deletes.push({index: smallestIndex.value, source: smallestIndex.sources})
  }
  return {insert: inserts, delete: deletes}
}

module.exports = merge
},{"underscore":38}],28:[function(require,module,exports){

var _ = require('underscore')

var patch = function(before, diff) {
  var result = _.clone(before)
  var prefix = []
  var insertValues = function(index) { return function(update) {
    if (index == -1) {
      prefix = prefix.concat(update.values)
    } else {
      if (result[index].constructor != Array) result[index] = [result[index]]
      result[index] = result[index].concat(update.values)      
    }
  }}

  if (diff.insert) diff.insert.forEach(function(each) {
    each[1].forEach(insertValues(each[0]))
  })

  if (diff.delete) diff.delete.forEach(function(each) {
    if (result[each.index].constructor != Array) result[each.index] = [result[each.index]]
    result[each.index] = result[each.index].slice(1)
  })

  return prefix.concat(_.flatten(result))
}

module.exports = patch
},{"underscore":38}],29:[function(require,module,exports){

var _ = require('underscore')
var listDiff = require('../ordered-list/index').diff

function ArrayDiff() {
  this.diff = []
}

ArrayDiff.prototype.newIndex = function(index) {
  var array = _.find(this.diff, function(each) { return each[0] == index })
  if (!array) {
    array = [index, []]
    this.diff.push(array)
  }
  return array[1]
}

ArrayDiff.prototype.addMove = function(newIndex, oldIndex) {
  var entries = this.newIndex(newIndex)
  entries.push({move: oldIndex})
}

ArrayDiff.prototype.addInsert = function(newIndex, value) {
  var entries = this.newIndex(newIndex)
  entries.push({insert: value})
}

ArrayDiff.prototype.addDelete = function(oldIndex) { this.addMove(null, oldIndex) }

var orderedSetDiff = function(before, after) {
  var diffRes = listDiff(before, after)
  var result = new ArrayDiff()
  
  var cutValues = {}
  // find all deletes who are actually moved/cut values:
  if (diffRes.delete) diffRes.delete.forEach(function(each) {
    var index = each.index
    if (_.contains(after, before[index])) {
      cutValues[before[index]] = index
    } else {
      result.addDelete(index)
    }
  })
  // find out which inserts are actually moved values:
  if (diffRes.insert) diffRes.insert.forEach(function(each) {
    each[1][0].values.forEach(function(value, i) {
      var currentCutIndex = cutValues[value]
      if (currentCutIndex === undefined) {
        result.addInsert(each[0], value)
      } else {
        result.addMove(each[0], currentCutIndex)
      }
    })
  })
  return result
}

module.exports = orderedSetDiff

},{"../ordered-list/index":26,"underscore":38}],30:[function(require,module,exports){
arguments[4][8][0].apply(exports,arguments)
},{"./diff":29,"./merge":31,"./patch":32,"dup":8}],31:[function(require,module,exports){

var _ = require('underscore')
var dictionaryMerge = require('../dictionary/index').merge
var arrayDiff = require('./diff')

function Result(diff, conflicts) {
  this.diff = diff
  if (conflicts) this.conflict = conflicts
}

// always pick source 0
Result.prototype.resolveConflicts = function() {
  var resolved = []
  this.diff.forEach(function(each) {
    var updates = []
    each[1].forEach(function(update) {
      if (update.conflict) {
        if (update.source[0] == 0) {
          update = _.clone(update)
          delete update.conflict
          updates.push(update)
        }
      } else {
        updates.push(update)
      }
    })
    if (updates.length) resolved.push([each[0], updates])
  })
  return new Result(resolved)
}

function Conflicts(values) {
  this._nextID = 1
  this.map = {}
  if (values) values.forEach(this.addConflict, this)
}

Conflicts.prototype.addConflict = function(value) {
  this.map[value] = this.nextID()
}

Conflicts.prototype.conflictID = function(value) {
  return this.map[value]
}

Conflicts.prototype.nextID = function() {
  return this._nextID++
}


var addSources = function(diff, i) {
  return diff.diff.map(function(each) {
    var entries = each[1].map(function(entry) {
      var updatedEntry = _.clone(entry)
      updatedEntry.source = [i]
      return updatedEntry
    })
    return [each[0], entries]
  })
}

var oldToNewIndexMap = function(diff, i) {
  var map = {}
  diff.forEach(function(each) {
    each[1].forEach(function(entry) {
      if (entry.move !== undefined) map[entry.move] = {value: each[0], source: [i]}
    })
  })
  return {diff: map}
}

var markIndexConflicts = function(conflicts) { return function(diff) {
  return diff.map(function(each) {
    var updates = each[1].map(function(update) {
      if (update.move) {
        var conflict = conflicts.conflictID(update.move)
        if (conflict) update.conflict = conflict
      }
      return update
    })
    return [each[0], updates]
  })
}}

var sortByNewIndexDesc = function(diff) {
  return diff.sort(function(a, b) { return a[0] < b[0] })
}

var union = function(diff1, diff2, opts) {
  var result = []
  while(diff1.length && diff2.length) {
    var entries = [diff1, diff2].map(function(each) { return each.pop() })
    var newIndexes = entries.map(function(each) { return each[0] })
    if (newIndexes[0] == newIndexes[1]) {
      result.push([ entries[0][0], opts.onUpdatesAtSameIndex(entries[0][1], entries[1][1]) ])
    } else if ((!entries[0]) || (newIndexes[0] > newIndexes[1])) {
      if (entries[0]) diff1.push(entries[0])
      result.push(entries[1])
    } else {
      if (entries[1]) diff2.push(entries[1])
      result.push(entries[0])
    }
  }
  return result.concat(diff1, diff2)
}

var serializeUpdate = function(update) {
  return update.insert !== undefined ? JSON.stringify({i: update.insert}) : update.move
}

var mergeEntry = function(updates1, updates2, conflicts) {
  var updates2Map = {}
  var arrays = [updates1, updates2].map(function(each) {
    return each.map(function(update) {
      var serialized = update.insert !== undefined ? 'i'+update.insert : update.move
      updates2Map[serialized] = update
      return serialized
    })
  })

  var updateDiff = arrayDiff(arrays[0], arrays[1])

  var result = updates1.map(function(each) {
    each.source = [0, 1]
    return [each]
  })
  updateDiff.diff.forEach(function(each) {
    var index2 = each[0]
    each[1].forEach(function(diffEntry) {
      if (index2 === null) {
        var update1 = updates1[diffEntry.move]
        update1.source = [0]
      } else if (diffEntry.insert !== undefined) {
        var update2 = updates2Map[diffEntry.insert]
        update2.source = [1]
        if (update2.move !== undefined) {
          var conflictID = conflicts.conflictID(update2.move)
          if (conflictID) update2.conflict = conflictID
        }
        result[index2].push(update2)
      } else if (diffEntry.move !== undefined) {
        var update1 = updates1[diffEntry.move]
        var update2 = updates2Map[diffEntry.move]
        var existingConflict = update1.move !== undefined ? conflicts.conflictID(update1.move) : undefined
        var conflictID = existingConflict ? existingConflict : conflicts.nextID()
        [update1, update2].forEach(function(each, i) {
          each.conflict = conflictID
          each.source = [i]
        })
        result[index2].push(update2)
      }
    })
  })

  return _.flatten(result)
}

var merge = function(diffs) {
  var diffs = diffs.map(addSources)

  // find all conflicts caused by moving the same object to different positions
  var moveMaps = diffs.map(oldToNewIndexMap)
  var conflicts = new Conflicts(dictionaryMerge(moveMaps).conflict)
  diffs = diffs.map(markIndexConflicts(conflicts))

  // find all sequence conflicts for updates at the same origin position
  diffs = diffs.map(sortByNewIndexDesc)
  var diffUnion = union(diffs[0], diffs[1], {
    onUpdatesAtSameIndex: function(updates1, updates2) {
      return mergeEntry(updates1, updates2, conflicts)
    }
  })

  return new Result(diffUnion, conflicts._nextID - 1)
}

merge.Result = Result
module.exports = merge

},{"../dictionary/index":21,"./diff":29,"underscore":38}],32:[function(require,module,exports){
arguments[4][14][0].apply(exports,arguments)
},{"dup":14,"underscore":38}],33:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"dup":16,"underscore":38}],34:[function(require,module,exports){
arguments[4][8][0].apply(exports,arguments)
},{"./diff":33,"./merge":35,"./patch":36,"dup":8}],35:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18,"underscore":38}],36:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19,"underscore":38}],37:[function(require,module,exports){

var indexMap = function(list) {
  var map = {}
  list.forEach(function(each, i) {
    map[each] = map[each] || []
    map[each].push(i)
  })
  return map
}

var longestCommonSubstring = function(seq1, seq2) {
  var result = {startString1:0, startString2:0, length:0}
  var indexMapBefore = indexMap(seq1)
  var previousOverlap = []
  seq2.forEach(function(eachAfter, indexAfter) {
    var overlapLength
    var overlap = []
    var indexesBefore = indexMapBefore[eachAfter] || []
    indexesBefore.forEach(function(indexBefore) {
      overlapLength = ((indexBefore && previousOverlap[indexBefore-1]) || 0) + 1;
      if (overlapLength > result.length) {
        result.length = overlapLength;
        result.startString1 = indexBefore - overlapLength + 1;
        result.startString2 = indexAfter - overlapLength + 1;
      }
      overlap[indexBefore] = overlapLength
    })
    previousOverlap = overlap
  })
  return result
}

module.exports = longestCommonSubstring

},{}],38:[function(require,module,exports){
//     Underscore.js 1.4.4
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var push             = ArrayProto.push,
      slice            = ArrayProto.slice,
      concat           = ArrayProto.concat,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.4.4';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? null : [];
    return _[first ? 'find' : 'filter'](obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See: https://bugs.webkit.org/show_bug.cgi?id=80797
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        index : index,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index < right.index ? -1 : 1;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(obj, value, context, behavior) {
    var result = {};
    var iterator = lookupIterator(value || _.identity);
    each(obj, function(value, index) {
      var key = iterator.call(context, value, index, obj);
      behavior(result, key, value);
    });
    return result;
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
    });
  };

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key) {
      if (!_.has(result, key)) result[key] = 0;
      result[key]++;
    });
  };

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    each(input, function(value) {
      if (_.isArray(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(concat.apply(ArrayProto, arguments));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(args, "" + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, l = list.length; i < l; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, l = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    var args = slice.call(arguments, 2);
    return function() {
      return func.apply(context, args.concat(slice.call(arguments)));
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, result;
    var previous = 0;
    var later = function() {
      previous = new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, result;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var values = [];
    for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var pairs = [];
    for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] == null) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent, but `Object`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                               _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
        return false;
      }
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(n);
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);

},{}]},{},[6])(6)
});