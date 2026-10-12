// First-person and other subject conjugations for the 66 unique irregular verbs
// identified by the learner. Subject pronouns are omitted from Spanish prompts;
// reflexive clitics (me/te/se/nos) remain part of the verb form.
const IRREGULAR_VERBS = [
  { verb: 'Pedir', present: ['pido', 'pides', 'pide', 'pedimos', 'piden'], preterite: ['pedí', 'pediste', 'pidió', 'pedimos', 'pidieron'], presentEnglish: 'ask for / order', preteriteEnglish: 'asked for / ordered' },
  { verb: 'Ser', present: ['soy', 'eres', 'es', 'somos', 'son'], preterite: ['fui', 'fuiste', 'fue', 'fuimos', 'fueron'], presentEnglishByPerson: ['I am', 'You are', 'He / She is; You (formal) are', 'We are', 'They / You all are'], preteriteEnglishByPerson: ['I was', 'You were', 'He / She was; You (formal) were', 'We were', 'They / You all were'] },
  { verb: 'Estar', present: ['estoy', 'estás', 'está', 'estamos', 'están'], preterite: ['estuve', 'estuviste', 'estuvo', 'estuvimos', 'estuvieron'], presentEnglishByPerson: ['I am', 'You are', 'He / She is; You (formal) are', 'We are', 'They / You all are'], preteriteEnglishByPerson: ['I was', 'You were', 'He / She was; You (formal) were', 'We were', 'They / You all were'] },
  { verb: 'Poder', present: ['puedo', 'puedes', 'puede', 'podemos', 'pueden'], preterite: ['pude', 'pudiste', 'pudo', 'pudimos', 'pudieron'], presentEnglish: 'can', preteriteEnglish: 'could / was able to' },
  { verb: 'Comenzar', present: ['comienzo', 'comienzas', 'comienza', 'comenzamos', 'comienzan'], preterite: ['comencé', 'comenzaste', 'comenzó', 'comenzamos', 'comenzaron'], presentEnglish: 'begin', preteriteEnglish: 'began' },
  { verb: 'Traer', present: ['traigo', 'traes', 'trae', 'traemos', 'traen'], preterite: ['traje', 'trajiste', 'trajo', 'trajimos', 'trajeron'], presentEnglish: 'bring', preteriteEnglish: 'brought' },
  { verb: 'Cerrar', present: ['cierro', 'cierras', 'cierra', 'cerramos', 'cierran'], preterite: ['cerré', 'cerraste', 'cerró', 'cerramos', 'cerraron'], presentEnglish: 'close', preteriteEnglish: 'closed' },
  { verb: 'Venir', present: ['vengo', 'vienes', 'viene', 'venimos', 'vienen'], preterite: ['vine', 'viniste', 'vino', 'vinimos', 'vinieron'], presentEnglish: 'come', preteriteEnglish: 'came' },
  { verb: 'Contar', present: ['cuento', 'cuentas', 'cuenta', 'contamos', 'cuentan'], preterite: ['conté', 'contaste', 'contó', 'contamos', 'contaron'], presentEnglish: 'count / tell', preteriteEnglish: 'counted / told' },
  { verb: 'Hacer', present: ['hago', 'haces', 'hace', 'hacemos', 'hacen'], preterite: ['hice', 'hiciste', 'hizo', 'hicimos', 'hicieron'], presentEnglish: 'do / make', preteriteEnglish: 'did / made' },
  { verb: 'Almorzar', present: ['almuerzo', 'almuerzas', 'almuerza', 'almorzamos', 'almuerzan'], preterite: ['almorcé', 'almorzaste', 'almorzó', 'almorzamos', 'almorzaron'], presentEnglish: 'eat lunch', preteriteEnglish: 'ate lunch' },
  { verb: 'Encontrar', present: ['encuentro', 'encuentras', 'encuentra', 'encontramos', 'encuentran'], preterite: ['encontré', 'encontraste', 'encontró', 'encontramos', 'encontraron'], presentEnglish: 'find', preteriteEnglish: 'found' },
  { verb: 'Encontrarse', present: ['me encuentro', 'te encuentras', 'se encuentra', 'nos encontramos', 'se encuentran'], preterite: ['me encontré', 'te encontraste', 'se encontró', 'nos encontramos', 'se encontraron'], presentEnglish: 'meet up', preteriteEnglish: 'met up' },
  { verb: 'Conseguir', present: ['consigo', 'consigues', 'consigue', 'conseguimos', 'consiguen'], preterite: ['conseguí', 'conseguiste', 'consiguió', 'conseguimos', 'consiguieron'], presentEnglish: 'get / obtain', preteriteEnglish: 'got / obtained' },
  { verb: 'Dar', present: ['doy', 'das', 'da', 'damos', 'dan'], preterite: ['di', 'diste', 'dio', 'dimos', 'dieron'], presentEnglish: 'give', preteriteEnglish: 'gave' },
  { verb: 'Ir', present: ['voy', 'vas', 'va', 'vamos', 'van'], preterite: ['fui', 'fuiste', 'fue', 'fuimos', 'fueron'], presentEnglish: 'go', preteriteEnglish: 'went' },
  { verb: 'Irse', present: ['me voy', 'te vas', 'se va', 'nos vamos', 'se van'], preterite: ['me fui', 'te fuiste', 'se fue', 'nos fuimos', 'se fueron'], presentEnglish: 'leave', preteriteEnglish: 'left' },
  { verb: 'Tener', present: ['tengo', 'tienes', 'tiene', 'tenemos', 'tienen'], preterite: ['tuve', 'tuviste', 'tuvo', 'tuvimos', 'tuvieron'], presentEnglish: 'have', preteriteEnglish: 'had' },
  { verb: 'Oír', present: ['oigo', 'oyes', 'oye', 'oímos', 'oyen'], preterite: ['oí', 'oíste', 'oyó', 'oímos', 'oyeron'], presentEnglish: 'hear', preteriteEnglish: 'heard' },
  { verb: 'Saber', present: ['sé', 'sabes', 'sabe', 'sabemos', 'saben'], preterite: ['supe', 'supiste', 'supo', 'supimos', 'supieron'], presentEnglish: 'know (a fact)', preteriteEnglish: 'knew / found out' },
  { verb: 'Conocer', present: ['conozco', 'conoces', 'conoce', 'conocemos', 'conocen'], preterite: ['conocí', 'conociste', 'conoció', 'conocimos', 'conocieron'], presentEnglish: 'know (personally)', preteriteEnglish: 'knew / met' },
  { verb: 'Salir', present: ['salgo', 'sales', 'sale', 'salimos', 'salen'], preterite: ['salí', 'saliste', 'salió', 'salimos', 'salieron'], presentEnglish: 'leave / go out', preteriteEnglish: 'left / went out' },
  { verb: 'Perder', present: ['pierdo', 'pierdes', 'pierde', 'perdemos', 'pierden'], preterite: ['perdí', 'perdiste', 'perdió', 'perdimos', 'perdieron'], presentEnglish: 'lose', preteriteEnglish: 'lost' },
  { verb: 'Poner', present: ['pongo', 'pones', 'pone', 'ponemos', 'ponen'], preterite: ['puse', 'pusiste', 'puso', 'pusimos', 'pusieron'], presentEnglish: 'put', preteriteEnglish: 'put' },
  { verb: 'Recordar', present: ['recuerdo', 'recuerdas', 'recuerda', 'recordamos', 'recuerdan'], preterite: ['recordé', 'recordaste', 'recordó', 'recordamos', 'recordaron'], presentEnglish: 'remember', preteriteEnglish: 'remembered' },
  { verb: 'Decir', present: ['digo', 'dices', 'dice', 'decimos', 'dicen'], preterite: ['dije', 'dijiste', 'dijo', 'dijimos', 'dijeron'], presentEnglish: 'say / tell', preteriteEnglish: 'said / told' },
  { verb: 'Ver', present: ['veo', 'ves', 've', 'vemos', 'ven'], preterite: ['vi', 'viste', 'vio', 'vimos', 'vieron'], presentEnglish: 'see', preteriteEnglish: 'saw' },
  { verb: 'Verse', present: ['me veo', 'te ves', 'se ve', 'nos vemos', 'se ven'], preterite: ['me vi', 'te viste', 'se vio', 'nos vimos', 'se vieron'], presentEnglish: 'look (physically)', preteriteEnglish: 'looked (physically)' },
  { verb: 'Dormir', present: ['duermo', 'duermes', 'duerme', 'dormimos', 'duermen'], preterite: ['dormí', 'dormiste', 'durmió', 'dormimos', 'durmieron'], presentEnglish: 'sleep', preteriteEnglish: 'slept' },
  { verb: 'Empezar', present: ['empiezo', 'empiezas', 'empieza', 'empezamos', 'empiezan'], preterite: ['empecé', 'empezaste', 'empezó', 'empezamos', 'empezaron'], presentEnglish: 'start', preteriteEnglish: 'started' },
  { verb: 'Pensar', present: ['pienso', 'piensas', 'piensa', 'pensamos', 'piensan'], preterite: ['pensé', 'pensaste', 'pensó', 'pensamos', 'pensaron'], presentEnglish: 'think', preteriteEnglish: 'thought' },
  { verb: 'Entender', present: ['entiendo', 'entiendes', 'entiende', 'entendemos', 'entienden'], preterite: ['entendí', 'entendiste', 'entendió', 'entendimos', 'entendieron'], presentEnglish: 'understand', preteriteEnglish: 'understood' },
  { verb: 'Querer', present: ['quiero', 'quieres', 'quiere', 'queremos', 'quieren'], preterite: ['quise', 'quisiste', 'quiso', 'quisimos', 'quisieron'], presentEnglish: 'want / love', preteriteEnglish: 'wanted' },
  { verb: 'Haber', present: ['he', 'has', 'ha / hay', 'hemos', 'han'], preterite: ['hube', 'hubiste', 'hubo', 'hubimos', 'hubieron'], presentEnglishByPerson: ['I have (done)', 'You have (done)', 'He / She has (done); There is / are; You (formal) have (done)', 'We have (done)', 'They / You all have (done)'], preteriteEnglishByPerson: ['I had (done)', 'You had (done)', 'He / She had (done); There was / were; You (formal) had (done)', 'We had (done)', 'They / You all had (done)'] },
  { verb: 'Elegir', present: ['elijo', 'eliges', 'elige', 'elegimos', 'eligen'], preterite: ['elegí', 'elegiste', 'eligió', 'elegimos', 'eligieron'], presentEnglish: 'choose', preteriteEnglish: 'chose' },
  { verb: 'Costar', present: ['cuesto', 'cuestas', 'cuesta', 'costamos', 'cuestan'], preterite: ['costé', 'costaste', 'costó', 'costamos', 'costaron'], presentEnglishByPerson: ['I cost', 'You cost', 'It costs; He / She costs; You (formal) cost', 'We cost (present)', 'They cost'], preteriteEnglishByPerson: ['I cost', 'You cost', 'It cost; He / She cost; You (formal) cost', 'We cost (preterite)', 'They cost'] },
  { verb: 'Morir', present: ['muero', 'mueres', 'muere', 'morimos', 'mueren'], preterite: ['morí', 'moriste', 'murió', 'morimos', 'murieron'], presentEnglish: 'die', preteriteEnglish: 'died' },
  { verb: 'Conducir', present: ['conduzco', 'conduces', 'conduce', 'conducimos', 'conducen'], preterite: ['conduje', 'condujiste', 'condujo', 'condujimos', 'condujeron'], presentEnglish: 'drive', preteriteEnglish: 'drove' },
  { verb: 'Caerse', present: ['me caigo', 'te caes', 'se cae', 'nos caemos', 'se caen'], preterite: ['me caí', 'te caíste', 'se cayó', 'nos caímos', 'se cayeron'], presentEnglish: 'fall', preteriteEnglish: 'fell' },
  { verb: 'Sentir', present: ['siento', 'sientes', 'siente', 'sentimos', 'sienten'], preterite: ['sentí', 'sentiste', 'sintió', 'sentimos', 'sintieron'], presentEnglish: 'feel', preteriteEnglish: 'felt' },
  { verb: 'Sentirse', present: ['me siento', 'te sientes', 'se siente', 'nos sentimos', 'se sienten'], preterite: ['me sentí', 'te sentiste', 'se sintió', 'nos sentimos', 'se sintieron'], presentEnglish: 'feel (emotion / state)', preteriteEnglish: 'felt (emotion / state)' },
  { verb: 'Volar', present: ['vuelo', 'vuelas', 'vuela', 'volamos', 'vuelan'], preterite: ['volé', 'volaste', 'voló', 'volamos', 'volaron'], presentEnglish: 'fly', preteriteEnglish: 'flew' },
  { verb: 'Seguir', present: ['sigo', 'sigues', 'sigue', 'seguimos', 'siguen'], preterite: ['seguí', 'seguiste', 'siguió', 'seguimos', 'siguieron'], presentEnglish: 'follow / continue', preteriteEnglish: 'followed / continued' },
  { verb: 'Freír', present: ['frío', 'fríes', 'fríe', 'freímos', 'fríen'], preterite: ['freí', 'freíste', 'frió', 'freímos', 'frieron'], presentEnglish: 'fry', preteriteEnglish: 'fried' },
  { verb: 'Vestirse', present: ['me visto', 'te vistes', 'se viste', 'nos vestimos', 'se visten'], preterite: ['me vestí', 'te vestiste', 'se vistió', 'nos vestimos', 'se vistieron'], presentEnglish: 'get dressed', preteriteEnglish: 'got dressed' },
  { verb: 'Divertirse', present: ['me divierto', 'te diviertes', 'se divierte', 'nos divertimos', 'se divierten'], preterite: ['me divertí', 'te divertiste', 'se divirtió', 'nos divertimos', 'se divirtieron'], presentEnglish: 'have fun', preteriteEnglish: 'had fun' },
  { verb: 'Incluir', present: ['incluyo', 'incluyes', 'incluye', 'incluimos', 'incluyen'], preterite: ['incluí', 'incluiste', 'incluyó', 'incluimos', 'incluyeron'], presentEnglish: 'include', preteriteEnglish: 'included' },
  { verb: 'Reírse', present: ['me río', 'te ríes', 'se ríe', 'nos reímos', 'se ríen'], preterite: ['me reí', 'te reíste', 'se rió', 'nos reímos', 'se rieron'], presentEnglish: 'laugh', preteriteEnglish: 'laughed' },
  { verb: 'Mover', present: ['muevo', 'mueves', 'mueve', 'movemos', 'mueven'], preterite: ['moví', 'moviste', 'movió', 'movimos', 'movieron'], presentEnglish: 'move (something)', preteriteEnglish: 'moved (something)' },
  { verb: 'Ofrecer', present: ['ofrezco', 'ofreces', 'ofrece', 'ofrecemos', 'ofrecen'], preterite: ['ofrecí', 'ofreciste', 'ofreció', 'ofrecimos', 'ofrecieron'], presentEnglish: 'offer', preteriteEnglish: 'offered' },
  { verb: 'Jugar', present: ['juego', 'juegas', 'juega', 'jugamos', 'juegan'], preterite: ['jugué', 'jugaste', 'jugó', 'jugamos', 'jugaron'], presentEnglish: 'play', preteriteEnglish: 'played' },
  { verb: 'Preferir', present: ['prefiero', 'prefieres', 'prefiere', 'preferimos', 'prefieren'], preterite: ['preferí', 'preferiste', 'prefirió', 'preferimos', 'prefirieron'], presentEnglish: 'prefer', preteriteEnglish: 'preferred' },
  { verb: 'Llover', present: ['lluevo', 'llueves', 'llueve', 'llovemos', 'llueven'], preterite: ['lloví', 'lloviste', 'llovió', 'llovimos', 'llovieron'], presentEnglishByPerson: ['I rain (rare)', 'You rain (rare)', 'It rains', 'We rain (rare)', 'They rain (rare)'], preteriteEnglishByPerson: ['I rained (rare)', 'You rained (rare)', 'It rained', 'We rained (rare)', 'They rained (rare)'] },
  { verb: 'Reconocer', present: ['reconozco', 'reconoces', 'reconoce', 'reconocemos', 'reconocen'], preterite: ['reconocí', 'reconociste', 'reconoció', 'reconocimos', 'reconocieron'], presentEnglish: 'recognize', preteriteEnglish: 'recognized' },
  { verb: 'Recomendar', present: ['recomiendo', 'recomiendas', 'recomienda', 'recomendamos', 'recomiendan'], preterite: ['recomendé', 'recomendaste', 'recomendó', 'recomendamos', 'recomendaron'], presentEnglish: 'recommend', preteriteEnglish: 'recommended' },
  { verb: 'Repetir', present: ['repito', 'repites', 'repite', 'repetimos', 'repiten'], preterite: ['repetí', 'repetiste', 'repitió', 'repetimos', 'repitieron'], presentEnglish: 'repeat', preteriteEnglish: 'repeated' },
  { verb: 'Devolver', present: ['devuelvo', 'devuelves', 'devuelve', 'devolvemos', 'devuelven'], preterite: ['devolví', 'devolviste', 'devolvió', 'devolvimos', 'devolvieron'], presentEnglish: 'return (something)', preteriteEnglish: 'returned (something)' },
  { verb: 'Volver', present: ['vuelvo', 'vuelves', 'vuelve', 'volvemos', 'vuelven'], preterite: ['volví', 'volviste', 'volvió', 'volvimos', 'volvieron'], presentEnglish: 'return (somewhere)', preteriteEnglish: 'returned (somewhere)' },
  { verb: 'Servir', present: ['sirvo', 'sirves', 'sirve', 'servimos', 'sirven'], preterite: ['serví', 'serviste', 'sirvió', 'servimos', 'sirvieron'], presentEnglish: 'serve', preteriteEnglish: 'served' },
  { verb: 'Mostrar', present: ['muestro', 'muestras', 'muestra', 'mostramos', 'muestran'], preterite: ['mostré', 'mostraste', 'mostró', 'mostramos', 'mostraron'], presentEnglish: 'show', preteriteEnglish: 'showed' },
  { verb: 'Sentarse', present: ['me siento', 'te sientas', 'se sienta', 'nos sentamos', 'se sientan'], preterite: ['me senté', 'te sentaste', 'se sentó', 'nos sentamos', 'se sentaron'], presentEnglish: 'sit down', preteriteEnglish: 'sat down' },
  { verb: 'Sonreír', present: ['sonrío', 'sonríes', 'sonríe', 'sonreímos', 'sonríen'], preterite: ['sonreí', 'sonreíste', 'sonrió', 'sonreímos', 'sonrieron'], presentEnglish: 'smile', preteriteEnglish: 'smiled' },
  { verb: 'Nevar', present: ['nievo', 'nievas', 'nieva', 'nevamos', 'nievan'], preterite: ['nevé', 'nevaste', 'nevó', 'nevamos', 'nevaron'], presentEnglishByPerson: ['I snow (rare)', 'You snow (rare)', 'It snows', 'We snow (rare)', 'They snow (rare)'], preteriteEnglishByPerson: ['I snowed (rare)', 'You snowed (rare)', 'It snowed', 'We snowed (rare)', 'They snowed (rare)'] },
  { verb: 'Probar', present: ['pruebo', 'pruebas', 'prueba', 'probamos', 'prueban'], preterite: ['probé', 'probaste', 'probó', 'probamos', 'probaron'], presentEnglish: 'try / test', preteriteEnglish: 'tried / tested' },
  { verb: 'Despertarse', present: ['me despierto', 'te despiertas', 'se despierta', 'nos despertamos', 'se despiertan'], preterite: ['me desperté', 'te despertaste', 'se despertó', 'nos despertamos', 'se despertaron'], presentEnglish: 'wake up', preteriteEnglish: 'woke up' },
  { verb: 'Leer', present: ['leo', 'lees', 'lee', 'leemos', 'leen'], preterite: ['leí', 'leíste', 'leyó', 'leímos', 'leyeron'], presentEnglish: 'read (present)', preteriteEnglish: 'read (past; pronounced “red”)' },
];

const subjectLabels = ['I', 'You', 'He / She', 'We', 'They / You all'];
const irregularThirdPerson = {
  be: 'is',
  can: 'can',
  cost: 'costs',
  do: 'does',
  go: 'goes',
  have: 'has',
  say: 'says',
};

function inflectEnglishThirdPerson(phrase) {
  return phrase.split(' / ').map((alternative) => {
    const words = alternative.split(' ');
    const verb = words[0].toLocaleLowerCase();
    if (irregularThirdPerson[verb]) {
      words[0] = irregularThirdPerson[verb];
    } else if (/[^aeiou]y$/i.test(words[0])) {
      words[0] = `${words[0].slice(0, -1)}ies`;
    } else if (/(s|x|z|ch|sh|o)$/i.test(words[0])) {
      words[0] = `${words[0]}es`;
    } else {
      words[0] = `${words[0]}s`;
    }
    return words.join(' ');
  }).join(' / ');
}

function englishFor(verb, tense, personIndex) {
  const overrides = tense === 'present'
    ? verb.presentEnglishByPerson
    : verb.preteriteEnglishByPerson;
  if (overrides) return overrides[personIndex];

  const phrase = tense === 'present' ? verb.presentEnglish : verb.preteriteEnglish;
  if (tense === 'present' && personIndex === 2) {
    const thirdPerson = verb.thirdPresentEnglish || inflectEnglishThirdPerson(phrase);
    return `He / She ${thirdPerson}; You (formal) ${phrase}`;
  }
  return `${subjectLabels[personIndex]} ${phrase}`;
}

export const IRREGULAR_VERB_CARDS = IRREGULAR_VERBS.flatMap((verb) => [
  ...verb.present.map((spanish, personIndex) => ({
    spanish,
    english: englishFor(verb, 'present', personIndex),
    conjugation: 'present',
    infinitive: verb.verb,
  })),
  ...verb.preterite.map((spanish, personIndex) => ({
    spanish,
    english: englishFor(verb, 'preterite', personIndex),
    conjugation: 'preterite',
    infinitive: verb.verb,
  })),
]);

export const IRREGULAR_VERB_COUNT = IRREGULAR_VERBS.length;
