function divElementEnostavniTekst(sporocilo) {
  var jeSmesko = sporocilo.indexOf('http://sandbox.lavbic.net/teaching/OIS/gradivo/') > -1;
  var jeSlika = (sporocilo.indexOf('.jpg') > -1) || (sporocilo.indexOf('.gif') > -1) || (sporocilo.indexOf('.png') > -1);
  var jeYT = sporocilo.indexOf('iframe') > -1;
  
  if (jeSmesko || jeYT || jeSlika) {
    sporocilo = sporocilo.replace(/\</g, '&lt;')
                .replace(/\>/g, '&gt;')
                .replace(/&lt;img/g, '<img')
                .replace(/png\' \/&gt;/g, 'png\' />')
                .replace(/gif\' \/&gt;/g, 'gif\' />')
                .replace(/jpg\' \/&gt;/g, 'jpg\' />')
                .replace(/&lt;iframe/g, '<iframe')
                .replace(/&lt;\/iframe&gt;/g, '</iframe>')
                .replace(/&gt;/g, '>');
                
    return $('<div style="font-weight: bold"></div>').html(sporocilo);
  } else {
    return $('<div style="font-weight: bold;"></div>').text(sporocilo);
  }
}

function divElementHtmlTekst(sporocilo) {
  return $('<div></div>').html('<i>' + sporocilo + '</i>');
}

function procesirajVnosUporabnika(klepetApp, socket) {
  var sporocilo = $('#poslji-sporocilo').val();
  
  sporocilo = dodajSlike(sporocilo);
  sporocilo = dodajYoutube(sporocilo);
  sporocilo = dodajSmeske(sporocilo);
  
  console.log(sporocilo);
  
  var sistemskoSporocilo;

  if (sporocilo.charAt(0) == '/') {
    sistemskoSporocilo = klepetApp.procesirajUkaz(sporocilo);
    if (sistemskoSporocilo) {
      $('#sporocila').append(divElementHtmlTekst(sistemskoSporocilo));
    }
  } else {
    sporocilo = filtirirajVulgarneBesede(sporocilo);
    klepetApp.posljiSporocilo(trenutniKanal, sporocilo);
    $('#sporocila').append(divElementEnostavniTekst(sporocilo));
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  }

  $('#poslji-sporocilo').val('');
}

var socket = io.connect();
var trenutniVzdevek = "", trenutniKanal = "";

var vulgarneBesede = [];
$.get('/swearWords.txt', function(podatki) {
  vulgarneBesede = podatki.split('\r\n');
});

function filtirirajVulgarneBesede(vhod) {
  for (var i in vulgarneBesede) {
    vhod = vhod.replace(new RegExp('\\b' + vulgarneBesede[i] + '\\b', 'gi'), function() {
      var zamenjava = "";
      for (var j=0; j < vulgarneBesede[i].length; j++)
        zamenjava = zamenjava + "*";
      return zamenjava;
    });
  }
  return vhod;
}

$(document).ready(function() {
  var klepetApp = new Klepet(socket);

  socket.on('vzdevekSpremembaOdgovor', function(rezultat) {
    var sporocilo;
    if (rezultat.uspesno) {
      trenutniVzdevek = rezultat.vzdevek;
      $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
      sporocilo = 'Prijavljen si kot ' + rezultat.vzdevek + '.';
    } else {
      sporocilo = rezultat.sporocilo;
    }
    $('#sporocila').append(divElementHtmlTekst(sporocilo));
  });

  socket.on('pridruzitevOdgovor', function(rezultat) {
    trenutniKanal = rezultat.kanal;
    $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
    $('#sporocila').append(divElementHtmlTekst('Sprememba kanala.'));
  });

  socket.on('sporocilo', function (sporocilo) {
    var novElement = divElementEnostavniTekst(sporocilo.besedilo);
    $('#sporocila').append(novElement);
  });
  
  socket.on('kanali', function(kanali) {
    $('#seznam-kanalov').empty();

    for(var kanal in kanali) {
      kanal = kanal.substring(1, kanal.length);
      if (kanal != '') {
        $('#seznam-kanalov').append(divElementEnostavniTekst(kanal));
      }
    }
    
    $('#seznam-kanalov div').click(function() {
      klepetApp.procesirajUkaz('/pridruzitev ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
  });

  socket.on('uporabniki', function(uporabniki) {
    $('#seznam-uporabnikov').empty();
    for (var i=0; i < uporabniki.length; i++) {
      $('#seznam-uporabnikov').append(divElementEnostavniTekst(uporabniki[i]));
    }
    
    $('#seznam-uporabnikov div').click(function() {
      var target = $(this).text();
      $("#poslji-sporocilo").val('/zasebno "' + target + '" ').focus();
    });
  });
  
  $("#vsebina").jrumble();
      
  socket.on('dregljaj', function(rezultat) {
    
    if (rezultat.dregljaj) {
      $("#vsebina").trigger('startRumble');
      
      setTimeout(function() {
        $("#vsebina").trigger('stopRumble');
      }, 1500);
    }
  });
  
  setInterval(function() {
    socket.emit('kanali');
    socket.emit('uporabniki', {kanal: trenutniKanal});
  }, 1000);

  $('#poslji-sporocilo').focus();

  $('#poslji-obrazec').submit(function() {
    procesirajVnosUporabnika(klepetApp, socket);
    return false;
  });
});

function dodajSmeske(vhodnoBesedilo) {
  var preslikovalnaTabela = {
    ";)": "wink.png",
    ":)": "smiley.png",
    "(y)": "like.png",
    ":*": "kiss.png",
    ":(": "sad.png"
  };
  
  for (var smesko in preslikovalnaTabela) {
    vhodnoBesedilo = vhodnoBesedilo.replace(smesko,
      "<img src='http://sandbox.lavbic.net/teaching/OIS/gradivo/" +
      preslikovalnaTabela[smesko] + "' />");
  }
  return vhodnoBesedilo;
}

function dodajSlike(vhodnoBesedilo) {
  var reg = new RegExp(/https?:\/\/.*?\.(jpg|png|gif)/gi);
  var id = vhodnoBesedilo.match(reg);
  
  if(id != null) {
    var str = "";
    
    for(var i = 0; i<id.length; i++) {
      str += "<img src='"+ id[i] + "' style='width:200px; margin-left:20px;' />";
    }
    
    vhodnoBesedilo += str;
  }

  return vhodnoBesedilo;
}

function dodajYoutube(vhodnoBesedilo) {
  var reg = new RegExp(/https:\/\/www\.youtube\.com\/watch\?v=.{11}/gi);
  var id = vhodnoBesedilo.match(reg);
  console.log(id);
  
  if(id != null) {
    var str = "";
    
    for(var i = 0; i<id.length; i++) {
      var tmp = id[i].substring(id[i].indexOf('=') + 1);
      str += "<iframe src='https://www.youtube.com/embed/" + tmp 
       + "' allowfullscreen style='width:200px; height:150px; margin-left:20px;'></iframe>";
    }
    vhodnoBesedilo += str;
  }
  
  return vhodnoBesedilo;
}
