var labelType, useGradients, nativeTextSupport, animate;

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

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
               .toString(16)
               .substring(1);
  }
  return s4(); // + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

Array.prototype.insert = function (index, item) {
  this.splice(index, 0, item);
};

function zeroPad(num, places) {
  var zero = places - num.toString().length + 1;
  return Array(+(zero > 0 && zero)).join("0") + num;
}

function findNode(tree, nodeId) {
    if (tree.id == nodeId) {
        return tree;
    }
    var i = 0;
    for (; i < tree.children.length; i++) {
        var result = findNode(tree.children[i], nodeId);   
        if (result)
        {
            return result;
        }
    }
    return null;
}

function nodeWithId(id) {
    return {
        id: id,
        name: null,
        displayName: id,
        data: {},
        parent: null,
        children: [],
        
        updateChildrenNames: function() {
            var i = 0;
            for (; i < this.children.length; i++) {
                this.children[i].name = zeroPad(i, 3) + ' ' + this.children[i].displayName;
            }
        }
    };
}

function insertNode(tree, node, index) {
    tree.children.insert(index, node);
    node.parent = tree;
    tree.updateChildrenNames();
}

function addNode(tree, node) {
    insertNode(tree, node, tree.children.length);
}

function removeNode(node) {
    var i = 0;
    for (; i < node.parent.children.length; i++) {
        if (node.parent.children[i].id == node.id) {
            node.parent.children.splice(i, 1);
            break;
        }
    }
    node.parent.updateChildrenNames();
    node.parent = null;
}

function init(){
    
    var nodeClickDoesAdd = true;
    var tree = nodeWithId('USER:' + guid());
    tree.name = '000 ' + tree.displayName;
    var i = 0;
    for (i = 0; i < 10; i++) {
        var node = nodeWithId(guid());
        node.name = String(i) + ' ' + node.id;
        addNode(tree, node);
    }
    
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

    //init Spacetree
    //Create a new ST instance
    var st = new $jit.ST({
        'injectInto': 'infovis',
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
        
        //Add a request method for requesting on-demand json trees. 
        //This method gets called when a node
        //is clicked and its subtree has a smaller depth
        //than the one specified by the levelsToShow parameter.
        //In that case a subtree is requested and is added to the dataset.
        //This method is asynchronous, so you can make an Ajax request for that
        //subtree and then handle it to the onComplete callback.
        //Here we just use a client-side tree generator (the getTree function).
        // request: function(nodeId, level, onComplete) {
      //     var ans = getTree(nodeId, level);
      //     onComplete.onComplete(nodeId, ans);
      //   },
        
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
            label.id = node.id;            
            label.innerHTML = node.name.substring(4);
            label.onclick = function() {
                var modelNode = findNode(tree, node.id);
                if (nodeClickDoesAdd) {
                    var subtree = nodeWithId(node.id);
                    var id = guid();
                    addNode(modelNode, nodeWithId(id));
                } else {
                    removeNode(modelNode);
                }
                
                st.morph(tree, {
                    hideLabels: false,
                    type: 'fade',
                    onComplete: function() {
                        st.refresh();
                    }
                });
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
    //load json data
    st.loadJSON(tree);
    //compute node positions and layout
    st.compute();
    //emulate a click on the root node.
    st.onClick(st.root);
    //end
    //Add event handlers to switch spacetree orientation.
   function get(id) {
      return document.getElementById(id);  
    };

    (function configureRadioSelector() {
        var add = get('r-add'), 
        remove = get('r-remove');
        function changeHandler() {
            nodeClickDoesAdd = add.checked;
        };
        onchange = add.onchange = remove.onchange = changeHandler;
    
        $(document).ready(function() {
            $(document).keypress(function(e) {
                if (String.fromCharCode(e.keyCode) == 'j') {
                    if (add.checked) {
                        remove.checked = true;
                    } else if (remove.checked) {
                        add.checked = true;
                    }
                    changeHandler();
                }
            });
        });
    })();
}
