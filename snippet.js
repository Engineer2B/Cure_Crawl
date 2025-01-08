// ==UserScript==
// @name         mijnafvalwijzer.nl download
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  try to convert mijnafvalwijzer.nl data into calendar files!
// @author       Boris Breuer
// @match        https://www.mijnafvalwijzer.nl/nl/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mijnafvalwijzer.nl
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @require https://code.jquery.com/jquery-2.1.4.min.js
// @require https://raw.githubusercontent.com/kamranahmedse/jquery-toast-plugin/bd761d335919369ed5a27d1899e306df81de44b8/dist/jquery.toast.min.js
// ==/UserScript==

/**
 * Te gebruiken op https://www.mijnafvalwijzer.nl/nl/${postcode}/${huisnummer}/.
 * Kopieert kalender evenementen voor 'Restafval', 'Papier en Karton' en 'Groente, Fruit en Tuinafval' naar je clipboard .
 * Plaats de gekopieerde tekst in een .ics file zodat deze kan worden geïmporteerd.
 * De evenementen vinden plaats de dag voordat het afval wordt opgehaald.
 */
var address = ''; // komt in het adres/locatie veld te staan
// Kalender data hebben een uniek id per item waar bij importeren naar gekeken wordt.
// Verhoog dit getal wanneer je dit script meerdere keren gebruikt of wanneer importeren niet lukt.
var base_unique_id = 100;

/* globals jQuery, $, waitForKeyElements */
function injectStylesheet(url) {
    $('head').append('<link rel="stylesheet" href="'+url+'" type="text/css" />');
}

Date.prototype.yyyymmddThhmmss = function() {
	var MM = this.getMonth() + 1; // getMonth() is zero-based
	var dd = this.getDate();
	var hh = this.getHours();
	var mm = this.getMinutes();
	var ss = this.getSeconds();

	return [this.getFullYear(),
	MM.toString().padStart(2, '0'),
	dd.toString().padStart(2, '0'),
		'T',
	hh.toString().padStart(2, '0'),
	mm.toString().padStart(2, '0'),
	ss.toString().padStart(2, '0')].join('');
};
var maanden = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
var maandToNumber = {};
maanden.forEach((maand, i_Maand) => {
	maandToNumber[maand] = i_Maand + 1;
});



var writeCal = (events) => {
	var date = new Date();
	const head = `BEGIN:VCALENDAR
PRODID:Calendar
VERSION:2.0\n`;
	const body = events.map((ev, i_Ev) => `BEGIN:VEVENT
UID:${i_Ev+base_unique_id}@default
CLASS:PUBLIC
DESCRIPTION:${ev.Description}
DTSTAMP;VALUE=DATE-TIME:${date.yyyymmddThhmmss()}
DTSTART;VALUE=DATE-TIME:${ev.StartDate}
DTEND;VALUE=DATE-TIME:${ev.EndDate}
LOCATION:${ev.Location}
SUMMARY;LANGUAGE=en-us:${ev.Summary}
TRANSP:TRANSPARENT
END:VEVENT`).join('\n');
	const footer = `\nEND:VCALENDAR`;
	return [head, ...body, footer].join('');
}

var events = [];
// Teksten zijn specifiek voor gemeente Eindhoven.
var collection = [
	{ Type: 'Restafval', Description: `Restafval\\nWat is het?\\n\\nRestafval is huishoudelijk afval dat niet meer gescheiden kan worden voor hergebruik of recycling. Afvalsoorten die u wel kunt scheiden, zoals gft, glas en oud papier, horen niet in het restafval thuis. Twijfelt u? Check dan op www.afvalscheidingswijzer.nl of in de AfvalABC waar uw afval thuis hoort. \\n\\nHoe biedt u restafval aan?\\n\\nEengezinswoningen gebruiken de grijze minicontainer (kliko) voor de inzameling van hun restafval. Deze container wordt eens per 2 weken geleegd. U helpt onze chauffeurs (en uzelf) enorm als u ervoor zorgt dat de container op de juiste manier wordt aangeboden. Belangrijk hierbij:\\n\\nPlaats de container maximaal 50 cm van de stoeprand\\nLaat minimaal 30 cm ruimte tussen 2 containers of andere obstakels (zoals lantaarnpalen of geparkeerde auto's).\\nPlaats de container met het handvat naar de stoep\\nZorg dat het deksel van de container dicht kan en gesloten is\\nEen container mag niet meer dan 70 kilo wegen. \\nOndergrondse restafvalcontainers\\nWoont u in een flat of appartement? Dan kunt u voor uw restafval gebruik maken van een ondergrondse container. Op enkele adressen wordt het restafval nog opgehaald in huisvuilzakken. \\n\\nU heeft een stadspas nodig om de container te openen. Heeft u geen stadspas? Vraag deze dan aan bij de gemeente Eindhoven.\\nGebruik maximaal zakken van 40 liter om verstoppingen te voorkomen.\\nIs de container vol of is er een storing? Meldt dit dan bij Cure. Neem uw afval weer mee naar huis of probeer een andere ondergrondse container in de buurt.\\nEr worden géén gegevens geregistreerd.\\nGebruik van de ondergrondse container kost niets. \\nHoud de omgeving van uw ondergrondse container schoon\\n\\nPlaats geen afval naast de container, u riskeert hiermee een boete van €123,99\\nMet uw stadspas kunt u ook andere containers in uw buurt openen. \\nGrof huishoudelijk afval (zoals meubels en huisraad) kunt u kwijt bij de milieustraten. Deze zijn gratis in Eindhoven.\\nU kunt grof huishoudelijk afval ook thuis op laten halen. Neem hiervoor contact op met de klantenservice van Cure Afvalbeheer.\\nWat hoort er wel / niet bij het restafval?\\n\\nWel:\\n\\nKattenbakkorrels (ook met het Eko keurmerk vanwege de ontlasting)\\nOntlasting van honden en katten\\nIn de ondergrondse container voor restafval mag ook GFT-afval\\nSigaretten(as)\\nMaandverband\\nRubber\\nNiet\\n\\nAlles wat gescheiden wordt ingezameld zoals:\\n\\nPapier en karton\\nGlas\\nPlastic of PBD (plastic, blik, drankkartons)\\nAsbest\\nKlein Chemisch afval (KCA)\\nTextiel\\nGrof huishoudelijk afval. Dit is te groot voor de container. \\nGFT-afval (huishoudens die gebruik maken van een ondergrondse container mogen GFT-afval wél bij het restafval doen)\\nWat gebeurt er met restafval.\\n\\nRestafval wordt gecontroleerd verbrand in grote ovens. Hiermee wordt energie (elektriciteit) en warmte opgewekt. Het product dat na verbranding overblijft, wordt bijvoorbeeld gebruikt als bouwmateriaal (bijv. wegfundering).` },
	{ Type: 'Papier en karton', Description: `Papier en karton\\nOud-papier wordt apart ingezameld zodat het gerecycled kan worden tot nieuw papier. Bijvoorbeeld: toiletpapier, verpakkingsmateriaal of kranten. Een kwart van al het huishoudelijk afval bestaat uit papier en karton. \\n\\nHoe zamelen we het afval in? \\n\\nOud papier plaatst u op de dag dat het ingezameld wordt op de stoep. Bundel het papier en karton met een touw of stop het in dozen. Bewoners van flats of appartementen moeten in sommige gevallen gebruik maken van ondergrondse containers voor oud-papier. Wanneer er geen ophaaldatum voor oud-papier in uw kalender staat, geldt dit voor u. Vind dan een container in uw buurt via het locatieoverzicht in deze app. \\n\\nWat hoort er wel/niet bij het papier en karton?\\n\\nWel\\nKranten en tijdschriften\\nReclamefolders\\nSchrijf- en tekenpapier\\nKartonnen en papieren verpakkingen \\nKartonnen dozen\\nEierdozen\\nCadeaupapier\\nEnveloppen\\nNiet\\nBehang\\nMelk- en sappakken\\nGeplastificeerd papier en sanitair papier (papieren zakdoekjes, keukenrol, maandverband)\\nVerontreinigd papier (zoals pizzadozen)\\nDiepvriesverpakkingen van groenten\\nFoto's \\n \\n\\nMeer informatie via: https://www.cure-afvalbeheer.nl/alles-over-afval/papier-en-karton/` },
	{ Type: 'Groente, Fruit en Tuinafval', Description: `Wat hoort er wel/niet bij het GFT afval?\\nWel:\\nSchillen en resten van groenten, fruit en aardappelen\\nResten van gekookt voedsel, ook vlees- en visresten (incl. botten)\\nEierschillen\\nKoffiefilters\\nBrood (zonder plastic)\\nOnkruid, gemaaid gras en bladeren\\nBloemen en huisplanten\\nUitwerpselen van kleine huisdieren zoals konijnen en hamsters\\n\\nNiet: \\nKoffiecups\\nGrond\\nUitwerpselen van katten en honden, paardenmest \\nPlantenpotten\\nPlastic (ook geen afbreekbaar plastic)\\nKattenbakkorrels (ook niet met ECO-keurmerk)\\nLuiers\\nWat gebeurt ermee? \\nGroente-, Fruit- en Tuinafval is een grondstof voor compost of biogas. GFT-afval kan ook worden vergist.\\nBij vergisting ontstaat biogas dat elektriciteit en warmte kan opwekken.\\nHet verwerken van GFT zorgt voor minder milieubelasting, bespaart grondstoffen en is bovendien goedkoper dan verbranden.` }
];

collection.forEach((colObj) => {
	var rawData = Array.from(document.querySelectorAll(`.textDecorationNone[title='${colObj.Type}']`));
	var reDate = /(?<DagWoord>\w+) (?<DagNummer>\w+) (?<Maand>\w+)/g;
	var now = new Date();
	events = events.concat(rawData.map((v, i_V) => {
		reDate.lastIndex = 0;
		const re = reDate.exec(v.children[0].children[0].innerText);
		const dateStr = `${now.getFullYear()}${maandToNumber[re.groups.Maand].toString().padStart(2, '0')}${(re.groups.DagNummer - 1).toString().padStart(2, '0')}`;
		return {
			StartDate: dateStr,
			EndDate: dateStr,
			Location: address,
			Summary: colObj.Type,
			Description: colObj.Description
		};
	}));
});
(function() {
	'use strict';
	    //inject jqtoast
    injectStylesheet("https://cdn.rawgit.com/kamranahmedse/jquery-toast-plugin/bd761d335919369ed5a27d1899e306df81de44b8/dist/jquery.toast.min.css");
	GM_registerMenuCommand(`Copy calendar data to clipboard`, (mouseEvt) => {
		GM_setClipboard(writeCal(events),'text');
		var currentdate = new Date();
		let f_pad = (v) => v.toString().padStart(2,'0');
		$.toast({
			text: 'The calendar data has been copied to the clipboard.<br>Paste into file and save as .ics.',
			heading: `${f_pad(currentdate.getFullYear())}-${f_pad(currentdate.getMonth()+1)}-${f_pad(currentdate.getDate())}`+
			` ${f_pad(currentdate.getHours())}:${f_pad(currentdate.getMinutes())}:${f_pad(currentdate.getSeconds())}.${currentdate.getMilliseconds()}`, // Optional heading to be shown on the toast
			loader: true,
			loaderBg: '#9EC600',
			showHideTransition: 'slide', // fade, slide or plain
			allowToastClose: true, // Boolean value true or false
			hideAfter: 10000, // false to make it sticky or number representing the miliseconds as time after which toast needs to be hidden
			stack: 5, // false if there should be only one toast at a time or a number representing the maximum number of toasts to be shown at a time
			position: 'top-right',
			bgColor: '#444444',
			textColor: '#eeeeee'
		});
	});
})();