var labelType, useGradients, nativeTextSupport, animate;
var nodeClickDoesAdd = true;

(function() {
  var ua = navigator.userAgent,
      iStuff = ua.match(/iPhone/i) || ua.match(/iPad/i),
      typeOfCanvas = typeof HTMLCanvasElement,
      nativeCanvasSupport = (typeOfCanvas == 'object' || typeOfCanvas == 'function'),
      textSupport = nativeCanvasSupport 
        && (typeof document.createElement('canvas').getContext('2d').fillText == 'function');
  //I'm setting this based on the fact that ExCanvas provides text support for IE
  //and that as of today iPhone/iPad current text support is lame
  labelType = (!nativeCanvasSupport || (textSupport && !iStuff))? 'Native' : 'HTML';
  nativeTextSupport = labelType == 'Native';
  useGradients = nativeCanvasSupport;
  animate = !(iStuff || !nativeCanvasSupport);
})();

var Log = {
  elem: false,
  write: function(text){
    if (!this.elem) 
      this.elem = document.getElementById('log');
    this.elem.innerHTML = text;
    this.elem.style.left = (500 - this.elem.offsetWidth / 2) + 'px';
  }
};

Array.prototype.insert = function (index, item) {
  this.splice(index, 0, item);
};

function initSpacetree(model, injectInfo) {
    
    var selfRef = {
        spaceTree: {}
    };
    
    //init Spacetree
    //Create a new ST instance
    var st = new $jit.ST({
        'injectInto': injectInfo,
        //set duration for the animation
        duration: 300,
        //set animation transition type
        transition: $jit.Trans.Quart.easeInOut,
        //set distance between node and its children
        levelDistance: 50,
        //set max levels to show. Useful when used with
        //the request method for requesting trees of specific depth
        levelsToShow: 2,
        //set node and edge styles
        //set overridable=true for styling individual
        offsetX: 100,
        //nodes or edges
        Node: {
            height: 20,
            width: 55,
            //use a custom
            //node rendering function
            type: 'nodeline',
            color:'#23A4FF',
            lineWidth: 2,
            align:"center",
            overridable: true
        },
        
        Edge: {
            type: 'bezier',
            lineWidth: 2,
            color:'#23A4FF',
            overridable: true
        },
        
        onBeforeCompute: function(node){
            Log.write("loading " + node.name);
        },
        
        onAfterCompute: function(){
            Log.write("done");
        },
        
        //This method is called on DOM label creation.
        //Use this method to add event handlers and styles to
        //your node.
        onCreateLabel: function(label, node) {
            var nodeName = node.name.substring(4);
            label.id = node.id;            
            label.innerHTML = nodeName;
            label.onclick = function() {
                if (nodeClickDoesAdd) {
                    var id = node.id.split(" ")[1];

                    if (nodeName == "USER") {
                       model.executeCommand(new AddJournalCommand(createGuid())); 
                    }
                    else {
                        model.executeCommand(new AddPageCommand(id, createGuid())); 
                    }
                    // 
                } else {
                    var id = node.id.split(" ")[1];
                    var name = node.name.split(" ")[1];
                    if (name.indexOf('JRNL') == 0) {
                        model.executeCommand(new RemoveJournalWithIdCommand(id));
                    } else if (name.indexOf('PAGE') == 0) {
                        model.executeCommand(new RemovePageWithIdCommand(id));
                    }
                }
                
                selfRef.spaceTree.refresh();
            };
            //set label styles
            var style = label.style;
            style.width = 40 + 'px';
            style.height = 17 + 'px';            
            style.cursor = 'pointer';
            style.color = '#fff';
            // style.backgroundColor = '#1a1a1a';
            style.fontSize = '0.8em';
            style.textAlign= 'center';
            style.textDecoration = 'underline';
            style.paddingTop = '3px';
        },
        
        //This method is called right before plotting
        //a node. It's useful for changing an individual node
        //style properties before plotting it.
        //The data properties prefixed with a dollar
        //sign will override the global node style properties.
        onBeforePlotNode: function(node){
            //add some color to the nodes in the path between the
            //root node and the selected node.
            if (node.selected) {
                node.data.$color = "#ff7";
            }
            else {
                delete node.data.$color;
            }
        },
        
        //This method is called right before plotting
        //an edge. It's useful for changing an individual edge
        //style properties before plotting it.
        //Edge data proprties prefixed with a dollar sign will
        //override the Edge global style properties.
        onBeforePlotLine: function(adj){
            if (adj.nodeFrom.selected && adj.nodeTo.selected) {
                adj.data.$color = "#eed";
                adj.data.$lineWidth = 3;
            }
            else {
                delete adj.data.$color;
                delete adj.data.$lineWidth;
            }
        }
    });
    selfRef.spaceTree = st;
    st.refresh = function() {
        this.morph(model.exportSpacetreeJSON(), {
            hideLabels: false,
            type: 'fade',
            onComplete: function() {
                st.refresh();
            }                
        });
    }

    st.loadJSON(model.exportSpacetreeJSON());
    st.compute();
    st.onClick(st.root);
    
    return st;
}

function init() {
        
    //Implement a node rendering function called 'nodeline' that plots a straight line
    //when contracting or expanding a subtree.
    $jit.ST.Plot.NodeTypes.implement({
        'nodeline': {
          'render': function(node, canvas, animating) {
                if(animating === 'expand' || animating === 'contract') {
                  var pos = node.pos.getc(true), nconfig = this.node, data = node.data;
                  var width  = nconfig.width, height = nconfig.height;
                  var algnPos = this.getAlignedPos(pos, width, height);
                  var ctx = canvas.getCtx(), ort = this.config.orientation;
                  ctx.beginPath();
                  if(ort == 'left' || ort == 'right') {
                      ctx.moveTo(algnPos.x, algnPos.y + height / 2);
                      ctx.lineTo(algnPos.x + width, algnPos.y + height / 2);
                  } else {
                      ctx.moveTo(algnPos.x + width / 2, algnPos.y);
                      ctx.lineTo(algnPos.x + width / 2, algnPos.y + height);
                  }
                  ctx.stroke();
              } 
          }
        }   
    });
    
    var leftClient = new PaperModelClient("left");
    var server = new PaperModelServer();
    var rightClient = new PaperModelClient("right");

    var leftClientSpacetree = initSpacetree(leftClient.localModel, 'infovis1');    
    var serverSpacetree = initSpacetree(server.model, 'infovis2');
    var rightClientSpacetree = initSpacetree(rightClient.localModel, 'infovis3');

    (function configureRadioSelector() {
        var add = document.getElementById('r-add'), 
        remove = document.getElementById('r-remove');
        function changeHandler() {
            nodeClickDoesAdd = add.checked;
        };
        onchange = add.onchange = remove.onchange = changeHandler;
    
        $(document).ready(function() {
            $(document).keypress(function(e) {
                if (String.fromCharCode(e.keyCode) == 'a') {
                    if (add.checked) {
                        remove.checked = true;
                    } else if (remove.checked) {
                        add.checked = true;
                    }
                    changeHandler();
                } else if (String.fromCharCode(e.keyCode) == 's') {
                    leftClient.push(server);
                    serverSpacetree.refresh();
                } else if (String.fromCharCode(e.keyCode) == 'f') {
                    rightClient.push(server);
                    serverSpacetree.refresh();
                } else if (String.fromCharCode(e.keyCode) == 'd') {
                    leftClient.pull(server);
                    leftClientSpacetree.refresh();
                    rightClient.pull(server);
                    rightClientSpacetree.refresh();
                }
            });
        });
    })();
}
