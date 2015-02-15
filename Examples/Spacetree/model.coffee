
root = exports ? this

## Command

class Command
    constructor: (@action) ->

## ModelObject

class root.ModelNode
    constructor: (@id, @label) ->
        @children = []
        
    _exportSpacetreeJSON: (modelId, childIndex) ->
        childrenJSON = (child._exportSpacetreeJSON(modelId, index) for child, index in @children)
        return id: "#{modelId} #{@id}", name: "#{zeroPad(childIndex, 3)} #{@label}", children: childrenJSON

## Model

class root.Model extends ModelNode
    constructor: (id, label) ->
        super(id, label)
        @executedCommands = []
    
    exportSpacetreeJSON: ->
        childrenJSON = (child._exportSpacetreeJSON(@id, index) for child, index in @children)
        return id: @id, name: "000 #{@label}", children: childrenJSON
        
    copyFrom: (model) ->
        @children = []
        for otherChild in model.children
            child = jQuery.extend(true, {}, otherChild)
            @children.push child
    
    executeCommand: (command) ->
        @executedCommands.push command
        command.action(this)
        revisionPrefix = "*"
        console.log "#{@id} now at revision #{revisionPrefix}#{@executedCommands.length}"
        
## Paper Model

class root.PaperModel extends Model
    constructor: (id) ->
        super(id, 'USER')
    addJournalWithId: (id) ->
        @children.push new ModelNode(id, "JRNL:#{id}")
    removeJournal: ->
        @children.splice(@children.length-1, 1);
    removeJournalWithId: (id) ->
        @children = @children.filter (journal) -> journal.id isnt id
        
## Commands

class root.AddJournalCommand extends Command
    constructor: (id) ->
        @action = (model) -> 
            model.addJournalWithId id
            
class root.RemoveJournalWithIdCommand extends Command
    constructor: (id) ->
        @action = (model) ->
            model.removeJournalWithId id

## Misc

zeroPad = (num, places) ->
    zero = places - num.toString().length + 1
    return Array(+(zero > 0 && zero)).join("0") + num

root.createGuid = () ->
    s4 = () ->
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return s4()
    #return s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();