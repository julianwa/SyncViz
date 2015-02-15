
root = exports ? this

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
    
    exportSpacetreeJSON: ->
        childrenJSON = (child._exportSpacetreeJSON(@id, index) for child, index in @children)
        return id: @id, name: "000 #{@label}", children: childrenJSON
        
    copyFrom: (model) ->
        @children = []
        for otherChild in model.children
            child = jQuery.extend(true, {}, otherChild)
            @children.push child
        
## Paper Model

class root.PaperModel extends Model
    constructor: (id) ->
        super(id, 'USER')
        @addJournal()
        @addJournal()
    addJournal: ->
        guid = createGuid();
        @children.push new ModelNode(guid, "JRNL:#{guid}")
    removeJournal: ->
        @children.splice(@children.length-1, 1);
    removeJournalWithId: (id) ->
        @children = @children.filter (journal) -> journal.id isnt id

## Misc

zeroPad = (num, places) ->
    zero = places - num.toString().length + 1
    return Array(+(zero > 0 && zero)).join("0") + num

createGuid = () ->
    s4 = () ->
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return s4()
    #return s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();