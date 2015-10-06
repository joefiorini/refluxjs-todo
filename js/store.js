(function(Reflux, TodoActions, global) {
    'use strict';

    // some variables and helpers for our fake database stuff
    var todoCounter = 0,
        primaryState = getInitialState('todos'),
        localStorageKey = "todos";

    function getInitialState(key) {
        var loadedList = localStorage.getItem(key)
        var list;

        if (!loadedList) {
            // If no list is in localstorage, start out with a default one
            list = [{
                key: todoCounter++,
                created: new Date(),
                isComplete: false,
                label: 'Rule the web'
            }];
        } else {
            list = _.map(JSON.parse(loadedList), function(item) {
                // just resetting the key property for each todo item
                item.key = todoCounter++;
                return item;
            });
        }

        return list;

    }

    function getItemByKey(list,itemKey){
        return _.find(list, function(item) {
            return item.key === itemKey;
        });
    }

    function getPayloadForAction(name, args) {
      switch (name) {
        case 'addItem':
          return { label: args[0] };
          break;
        case 'toggleItem':
        case 'removeItem':
          return { itemKey: args[0] };
        case 'editItem':
          return { itemKey: args[0], newLabel: args[1] };
        case 'toggleAllItems':
          return { checked: args[0] };
        default:
          return {};
      }

    }

    function reducerHandler(name, handler) {
      return function(itemKey, newLabel) {

        var args = Array.prototype.slice.apply(arguments);
        var payload = getPayloadForAction(name, args);

        // var args = [  primaryState,
        //               { itemKey: itemKey, newLabel: newLabel }
        //            ];
        var newState = handler.apply(this, [primaryState, payload]);

        localStorage.setItem(localStorageKey, JSON.stringify(newState));
        // if we used a real database, we would likely do the below in a callback
        primaryState = newState;
        this.trigger(primaryState); // sends the updated list to all listening components (TodoApp)
      };
    }

    function adaptStore(storeObject) {

      var finalObject = {};

      for (var key in storeObject) {
        if (!storeObject.hasOwnProperty(key)) {
          continue;
        }

        if (key === 'listenables' || key === 'updateList' || key === 'getInitialState') {
          finalObject[key] = storeObject[key];
          continue;
        }

        var firstLetter = key.slice(0, 1);
        var rest = key.slice(1, key.length);
        var newKey = 'on' + firstLetter.toUpperCase() + rest;
        finalObject[newKey] = reducerHandler(key, storeObject[key]);
      }

      return Reflux.createStore(finalObject);
    }

    global.todoListStore = adaptStore({
        // this will set up listeners to all publishers in TodoActions, using onKeyname (or keyname) as callbacks
        listenables: [TodoActions],
        editItem: function(state, payload) {
            var foundItem = getItemByKey(state, payload.itemKey);
            if (!foundItem) {
                return;
            }
            foundItem.label = payload.newLabel;
            return state;
        },
        addItem: function(state, payload) {
          return [{ key: todoCounter++,
                    created: new Date(),
                    isComplete: false,
                    label: payload.label
                }].concat(state);
        },
        removeItem: function(state, payload) {
            return _.filter(state,function(item){
                return item.key!==payload.itemKey;
            });
        },
        toggleItem: function(state, payload) {
            var foundItem = getItemByKey(state,payload.itemKey);
            if (foundItem) {
                foundItem.isComplete = !foundItem.isComplete;
            }
            return state;
        },
        toggleAllItems: function(state, payload) {
            return _.map(state, function(item) {
                item.isComplete = payload.checked;
                return item;
            });
        },
        clearCompleted: function(state) {
            return _.filter(state, function(item) {
                return !item.isComplete;
            });
        },
        // this will be called by all listening components as they register their listeners
        getInitialState: function() {
            return primaryState;
        }
    });

})(window.Reflux, window.TodoActions, window);
