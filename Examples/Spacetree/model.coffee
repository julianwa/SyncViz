
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
        @_executedCommands = []
    executedCommands: -> @_executedCommands
    
    exportSpacetreeJSON: ->
        childrenJSON = (child._exportSpacetreeJSON(@id, index) for child, index in @children)
        return id: @id, name: "000 #{@label}", children: childrenJSON
        
    fastForwardMerge: (model) ->
        @executeCommands(model.newerCommandsThan(@currentRevision()))
        if @currentRevision() isnt model.currentRevision()
            throw new Error "Current revision values should match"
    
    executeCommand: (command) ->
        @executedCommands().push command
        command.action(this)
        
    executeCommands: (commands) ->
        @executeCommand command for command in commands
        
    currentRevision: -> @_executedCommands.length
    
    newerCommandsThan: (baseRevision) ->
        if baseRevision < 0 or baseRevision > @_executedCommands.length
            throw new Error "newerCommandsThan: baseRevision out of range: baseRevision: #{baseRevision} numCommands: #{@_executedCommands.length}"
        return @_executedCommands.slice(baseRevision, @_executedCommands.length)
        
## Paper Model

class root.PaperModel extends Model
    constructor: (id) ->
        super(id, 'USER')
    addJournalWithId: (id) ->
        @children.push new ModelNode(id, "JRNL:#{id}")
    removeJournalWithId: (journalId) ->
        @children = @children.filter (journal) -> journal.id isnt journalId
    addPageWithId: (journalId, pageId) ->
        matchingJournals = @children.filter (journal) -> journal.id is journalId
        return if matchingJournals.length == 0
        throw new Error "matched more than one journals" if matchingJournals.length > 1
        matchingJournals[0].children.push new ModelNode(pageId, "PAGE:#{pageId}")
    removePageWithId: (pageId) ->
        for journal in @children
            journal.children = journal.children.filter (page) -> page.id isnt pageId
        
## Commands

class root.AddJournalCommand extends Command
    constructor: (journalId) ->
        @action = (model) -> 
            model.addJournalWithId journalId
            
class root.RemoveJournalWithIdCommand extends Command
    constructor: (journalId) ->
        @action = (model) ->
            model.removeJournalWithId journalId
            
class root.AddPageCommand extends Command
    constructor: (journalId, pageId) ->
        @action = (model) ->
            model.addPageWithId journalId, pageId

class root.RemovePageWithIdCommand extends Command
    constructor: (pageId) ->
        @action = (model) ->
            model.removePageWithId pageId
            
## Client / Server

class root.PaperModelClient
    constructor: (@id) ->
        @serverModel = new PaperModel("clientS_#{@id}")
        @localModel = new PaperModel("clientL_#{@id}")
        @localModelBaseRevision = 0
        
    localModelHasModifications: -> @localModel.currentRevision() isnt @localModelBaseRevision
    localModelNeedsRebase: ->
        # If there's no new commands from the server, then local never needs a rebase.
        if @serverModel.currentRevision() is @localModelBaseRevision
            return false
        # Otherwise, local only needs a rebase if there are local modifications.
        return @localModelHasModifications()

    push: (server) ->
        console.log("PUSH CLIENT: #{@id}")
        
        if @localModelNeedsRebase()
            console.log("   Local model needs rebase. Aborting.")
            return
        
        baseRevision = @serverModel.currentRevision()
        commands = @localModel.newerCommandsThan @serverModel.currentRevision()
        if commands.length > 0
            console.log("    attempting #{baseRevision} -> #{@localModel.currentRevision()}")
            if server.pushCommands(baseRevision, commands)
                console.log("   ACCEPTED")
                @serverModel.fastForwardMerge @localModel
                @localModelBaseRevision = @localModel.currentRevision()
            else
                console.log("   REJECTED")
                # TODO: handle fast-forward push rejection
        else
            console.log("    No commands to push.")

    fetch: (server, logPrefix) ->
        logPrefix = logPrefix ? ""
        console.log(logPrefix + "FETCH CLIENT: #{@id}")
        commands = server.newerCommandsThan @serverModel.currentRevision()
        if commands.length > 0
            baseRevision = @serverModel.currentRevision()
            @serverModel.executeCommands commands
            console.log(logPrefix + "    server: #{baseRevision} -> #{@serverModel.currentRevision()}")
        else
            console.log(logPrefix + "    No new commands")

    pull: (server) -> 
        console.log("PULL CLIENT: #{@id}")
        @fetch(server, "    ")

        if @localModelNeedsRebase()
            console.log("    Local model needs rebase. Aborting.")
            return

        if @localModelBaseRevision is @serverModel.currentRevision()
            console.log("    Nothing to do")
            return

        @localModel.fastForwardMerge @serverModel

        if @localModelBaseRevision is @localModel.currentRevision()
            console.log("    Nothing to do")
        else
            console.log("    local: #{@localModelBaseRevision} -> #{@localModel.currentRevision()}")     
            @localModelBaseRevision = @localModel.currentRevision()
            
class root.PaperModelServer
    constructor: ->
        @model = new PaperModel("server")
    pushCommands: (baseRevision, commands) ->
        if baseRevision is @model.currentRevision()
            @model.executeCommands commands
            return true
        return false
    newerCommandsThan: (baseRevision) -> @model.newerCommandsThan baseRevision
            

## Misc

zeroPad = (num, places) ->
    zero = places - num.toString().length + 1
    return Array(+(zero > 0 && zero)).join("0") + num

root.createGuid = () ->
    s4 = () ->
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return s4()
    #return s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();