var interactiveApp = {
  appRoutes: appRoutes,
  audioHandles: {},
  videoHandle: null,
  quizes: [],
  currentRoute: null,
  preloadjs: null
};

$(function() {

  var preload = new createjs.LoadQueue(false);
  interactiveApp.preloadjs = preload;
  preload.on('complete', handlePreloadComplete);
  $('#content').hide();

  function handlePreloadComplete () {
    console.log('preload complete..');  
    $('#preloader').hide();
    $('#content').show();
    initRouting();
  }

  if (manifestToLoad == undefined) manifestToLoad = [];

  $.each(interactiveApp.appRoutes, function (index, value) {
    if (value.audioURL) {
      manifestToLoad.push({id: value.name, src: value.audioURL});
    }
  });
  if (manifestToLoad.length) {
    // createjs.Sound.registerPlugins([createjs.HTMLAudioPlugin]);  // need this so it doesn't default to Web Audio
    // preload.installPlugin(createjs.Sound);
    preload.loadManifest(manifestToLoad);    
  } else {
    handlePreloadComplete(); 
  }

  function handleLoadedAssets () {
    return;
    var imgs = $('#content img');
    $.each(imgs, function(index, value) {
      var obj = $(value);
      if (obj.data('preloaded') == '1') return;      
      var result;
      if (result = interactiveApp.preloadjs.getResult(obj.attr('src'),true)) {
        var img = $('<img>', {
            src: URL.createObjectURL(result),
            alt: obj.attr('alt')
          })
        obj.data('preloaded','1')
            .hide()
            .after(img);
      }
      // $.each(manifestToLoad, function (i, v) {
      //   if (obj.attr("src") == v.src) {          
      //     var newAsset = interactiveApp.preloadjs.getTag(v.id);
      //     obj.data('preloaded','1')
      //       .hide()
      //       .after(newAsset);
      //     console.log(interactiveApp.preloadjs.getTag(v.id));
      //     // newAsset.attr('alt', obj.attr('alt'));
      //   }
      // });
    });
  }

  function initRouting() {

    interactiveApp.mainSection = $('#interactive-container > #content');

    $.sammy(function() {

      var _this = this;      

      $.each(interactiveApp.appRoutes, function(index, value) {   
        _this.before(value.url, function() {
          for (var p in interactiveApp.audioHandles) {
            // console.log(p);
            interactiveApp.audioHandles[p].stop();
          }
        });

        _this.get(value.url, function() {   
          // console.log('get: '+value.url);
          $.get(value.templateUrl, function(d) {

            interactiveApp.currentRoute = value;

            function setContent() {

              $('#logo').show();

              // set the content
              interactiveApp
                .mainSection
                .html(d);    

              handleLoadedAssets();

              initQuiz(value.id); 
              executeScript();    

              $('#next-nav, #nav-prev').off('click');

              $('#nav-next').on('click', function(e) {
                e.stopPropagation();
                if (index+1 < interactiveApp.appRoutes.length) {
                  window.location = '#'+interactiveApp.appRoutes[index+1].url;      
                  interactiveApp.playAudio(interactiveApp.appRoutes[index+1].name);
                }

                return false;
              });

              $('#nav-prev').on('click', function(e) {
                e.stopPropagation();

                var href = $(this).attr('href');
                if (href) {
                  window.location = href;                  
                  href = href.substring(1);
                  for (var i=0; i<interactiveApp.appRoutes.length; i++) {
                    var route = interactiveApp.appRoutes[i];
                    if (href == route.url) {
                      if (route.audioURL) {
                        interactiveApp.playAudio(route.name);
                      }
                      break;
                    }
                  }
                }
                else if (index-1 > -1) {
                  window.location = '#'+interactiveApp.appRoutes[index-1].url;      
                  interactiveApp.playAudio(interactiveApp.appRoutes[index-1].name);
                }
                

                return false;
              });

              if (value.postTracked == undefined || value.postTracked == false) {
                interactiveApp.LOProgress.set(value);            
              }
            }


            if (interactiveApp.outAnim) {
              interactiveApp.outAnim( setContent );
            }
            else {
              setContent();
            }
            
          })
        });      
      });

    }).run();

  }

});

interactiveApp.LOProgress = {
  init: function() {
    var self = this;
    self.totalProgressEl = $('#total-progress');
    self.totalProgress = 0;
    self.visitedSection = [];
  },
  set: function(section) {
    var self = this;
    if (self.visitedSection.indexOf(section) == -1 && section.tracked != undefined) {
      self.totalProgress += section.tracked;
      //self.totalProgressEl.css('width', self.totalProgress+'%');
      self.visitedSection.push(section);
    }
  }
};
interactiveApp.LOProgress.init();

interactiveApp.playAudio = function (id) {
  if (interactiveApp.audioHandles[id]) {
    interactiveApp.audioHandles[id] = createjs.Sound.play(id);
  }
};

$(window).TabWindowVisibilityManager({
    onFocusCallback: function(){
        for (var p in interactiveApp.audioHandles) {
          interactiveApp.audioHandles[p].paused = false;
        }
        if (interactiveApp.videoHandle) {
          interactiveApp.videoHandle.play();
        }
    },
    onBlurCallback: function(){
        for (var p in interactiveApp.audioHandles) {
          interactiveApp.audioHandles[p].paused = true;
        }
        if (interactiveApp.videoHandle) {
          interactiveApp.videoHandle.pause();
        }
    }
});


// window resized
  var ic, w, h;

  ic = $('#interactive-container');
  w = ic.width();
  h = ic.height();


  $(window).resize(resizeme);
  function resizeme() {    
    var win = $(window),
        windowHeight = win.height(),
        windowWidth = win.width(),
        proportion = {w:5, h:3},
        ratio = proportion.w / proportion.h;

    var currentRatio = windowWidth/windowHeight;

    if (currentRatio > ratio) {
      // wider
      h = windowHeight;
      w = h * ratio;
      ic.css({height:h, width:w});
    } else if (currentRatio < ratio) {
      // higher
      w = windowWidth;
      h = w * proportion.h / proportion.w;
      ic.css({height: h, width: w});      
    }
  }
  resizeme();
  ic.flowtype({
    fontRatio : 45
  });  

    interact('#interactive-container .moveable')
     .draggable({
        onmove: calcPercentPos
      })
     .resizable({
      edges:{right:true, bottom:true}
      })
     .on('resizemove', calcPercentSize);

var selectedEl = {}, deselect = false;
$(document).ready(function() {
  ic.on('click', '.moveable', function() {
    var obj = $(this);
    if (obj.hasClass('selected')) {
        obj.removeClass('selected');
        delete selectedEl[obj.attr('id')];        
    } else {
      obj.addClass('selected');
      selectedEl[obj.attr('id')] = obj;
    }
  });
});

function alignTop () {
  var top = h;
  $.each(selectedEl, function(i, obj) {
    var objTop = obj.position().top;
    if (objTop < top) top = objTop;
  });
  $.each(selectedEl, function(i, obj) {
    var hp = obj.parent().height();
    obj.css({top:top/hp * 100 + '%'});    
  });
}

function alignLeft () {
  var left = w;
  $.each(selectedEl, function(i, obj) {
    var objLeft = obj.position().left;
    if (objLeft < left) left = objLeft;
  });
  $.each(selectedEl, function(i, obj) {
    var wp = obj.parent().width();
    obj.css({left:left/wp * 100 + '%'});    
  });
}

function alignRight () {
  var widest = 0;
  $.each(selectedEl, function(i, obj) {
    var objWide = obj.position().left + obj.width();
    if (objWide > widest) widest = objWide;
  });
  $.each(selectedEl, function(i, obj) {
    var wp = obj.parent().width();    
    obj.css({left:(widest - obj.width())/wp * 100 + '%'});    
  });
}

function alignBottom () {
  var highest = 0;
  $.each(selectedEl, function(i, obj) {
    var objHeight = obj.position().top + obj.height();
    if (objHeight > highest) highest = objHeight;
  });
  $.each(selectedEl, function(i, obj) {
    var hp = obj.parent().height();    
    obj.css({top:(highest - obj.height())/hp * 100 + '%'});    
  });
}

// Description:
//    Returns a random, alphanumeric string
//
// Arguments:
//    Length (Integer): Length of string to be generated. Defaults to random
//    integer.
//
// Returns:
//    Rand (String): Pseudo-random, alphanumeric string.
var ridx = 0;
function random_str () {
  var prefix = '';
  prefix = prefix || [('group'), (+new Date).toString(36)].join('-');

  return this.prefix + (this.ridx++).toString(36);
}

  function calcPercentPos(evt) {    
    var obj = $(evt.target),
        pos = obj.position(),
        x = pos.left + evt.dx,
        y = pos.top + evt.dy;

    var parent = obj.parent(),
        wp = parent.width(),
        hp = parent.height();


    $(obj).css({
      left: x / wp * 100 + "%",
      top: y / hp * 100 + "%"
    });

    // $(obj).css({
    //   left: x / wp * 100 + "%"
    // });
  };

  function calcPercentSize(evt) {    
    var obj = $(evt.target),
        parent = obj.parent(),
        wp = parent.width(),
        hp = parent.height(),
        minWidth = minHeight = 3, //percent
        width = evt.rect.width/wp * 100,
        height = evt.rect.height/hp * 100;

    width = width < minWidth ? minWidth : width;
    height = height < minHeight ? minHeight : height;
    $(obj).css({
      width: width+"%",
      height: height+"%"
    });
  };

function clog (str) {
  console.log(str);
}

var quizes;
function executeScript() {
  // prepare new quizdata container
  quizes = new Array(); 
  // remove the contenteditable
  $('[contenteditable]').removeAttr('contenteditable');
  // execute the scripts
   $('.script').each (function(i, el) {
      el = $(el);
      var scriptText = el.text();
      if (scriptText) {
        el.hide();
        try {
          var scriptVar = eval(scriptText);      
          if (scriptVar.quizType != undefined) {
            // it is a quiz!
            quizes.push(scriptVar);
          }
        }catch (ex) {}        
      }
    }); // end each   
}; // end executeScript

var currentQuizGroup, currentPageID;
function initQuiz (pageID) {
  currentPageID = pageID;
  initQuizMC();
  initQuizBtns();
  initQuizResponse();
}

function initQuizBtns () {
  // $('.quiz-next-btn').hide();

  $('#quiz-submit-btn').on('click', function() {
    var $submitBtn = $(this);
    // $('.quiz .alert-box').hide();  

    if (quizes) {
      var allCorrect = true, 
          reachMaxTry = false;

      $.each (quizes, function (i, quiz) {
        var quizID = quiz.id;
        var status = 'incorrect';
        currentQuizGroup = quizGroup[quiz.group];

        if (currentQuizGroup.maxTry > 0) 
          quiz.tries = parseInt(quiz.tries) + 1;        

        var result = true;
        switch (quiz.quizType) {
          case 'mc':
          case 'tf':
            var answer = quiz.answer;              
            var userAnswer = $('input[name='+quizID+']:checked').val();
            quiz.userAnswer = userAnswer;
            if ( answer != userAnswer ) {
              result = false;                
            } 
          break;

          // case 'sa':
          //   $.each (quiz.answer, function (key, val) {
          //     var answers = val.split('#');
          //     $.each (answers, function (i, answer) {
          //       answers[i] = answer.trim();
          //     });
          //     var userAnswer = $('#'+key).val().trim();
          //     if ( answers.indexOf(userAnswer) == -1) {
          //       result = false;
          //       return false;
          //     }                
          //   });
          // break;

          // case 'dd':
          //   $.each (quiz.answer, function (key, val) {
          //     var answer = val;              
          //     var userAnswer = $('#'+key).val();
          //     if ( answer != userAnswer ) {
          //       result = false;
          //       return false;
          //     }                
          //   });
          // break;

          // case 'matching':
          //   result = checkQuizMatching();
          // break;
        }

        quiz.result = result;
        
        // mark result in group..
        $.each (currentQuizGroup.quizes, function (i, q) {
          if (q.page == currentPageID && q.quizID == quizID) {
            q.result = result;
            q.userAnswer = quiz.userAnswer;
            return false; // found - stop searching
          }
        });

        if (result) {
          status = 'correct';             
        } else {          
          if (currentQuizGroup.maxTry != 0 && quiz.tries >= currentQuizGroup.maxTry) {
            reachMaxTry = true;
            status = 'correction';
          } else {
            allCorrect = false;
            status = 'incorrect';
          }  
        }        

        $('#'+quizID+'-'+status).fadeIn();              
        clog(status);
        $(document).trigger('quiz/checked', {quizID:quizID, quizGroup:quiz.group, quizType:quiz.quizType, status:status});

      }); // end each quiz in this page!

      if (allCorrect || reachMaxTry) {
        $('.quiz-next-btn').show();
        $submitBtn.hide();

        checkAllQuestionInGroupAnswered();

      } // end if
    }
  }); // end on click submit

}

function checkAllQuestionInGroupAnswered () {
  // are all the questions answered in the group?
  var allAnswered = true;
  var totalCorrect = 0;
  $.each (currentQuizGroup.quizes, function (i, q) {
    if (q.result == undefined) {
      allAnswered = false;      
    } else if (q.result) {
      totalCorrect++;
    } 
  }); // end each

  clog('benar = '+totalCorrect+' dari '+currentQuizGroup.quizes.length);

  if (allAnswered) {
    clog('semua udah');
    var modal = $('.modal-catel');

    if (modal.length) {
      var htmlEl = modal.children(':not(.close-reveal-modal)');
      var htmlStr = htmlEl.html();
      htmlStr = htmlStr.replace('{correct}', totalCorrect);
      htmlStr = htmlStr.replace('{total}', currentQuizGroup.quizes.length);
      htmlEl.replaceWith(htmlStr);
          }

    $.each(appRoutes, function (i, el) {
      if (el.id == currentPageID) {        
        interactiveApp.LOProgress.set(el);
        return false;
      }
    });

  } else {
    clog('msi ad belum ');    
  }
}

function initQuizResponse () {
  $('.quiz-response').hide();
}

function initQuizMC () {
  $('.quiz-input-radio').each(function (i, el) {
    $(el).prop('checked', false);
  }); 
}