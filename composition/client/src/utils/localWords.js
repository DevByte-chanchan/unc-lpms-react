// Words the spell checker accepts although they are not English: the Filipino and Taglish, and the Naga
// (Central) Bikol, that reviewers and instructors at UNC write in their comments. They only stop a word from being
// underlined; they are never offered as a fix for an English typo. Words of three letters or fewer are not
// checked at all (MIN_WORD_LENGTH), so they are not listed. Add a word anywhere in its list.

const FILIPINO = `
ako ikaw siya kami tayo kayo sila akin amin atin inyo kanila kaniya kanya niya nila natin namin ninyo
ito iyan iyon dito diyan doon rito riyan roon ganito ganyan ganoon gayon ganun ganon
hindi huwag wala walang meron mayroon mayron mayroong kasi naman lang lamang talaga sobra medyo
baka siguro sana dapat kailangan kelangan pwede puwede maaari maari gusto ayaw ayoko kaya kaso
pero subalit ngunit dahil kapag kung kundi bago habang hanggang upang para pati saka tsaka tapos
pagkatapos ngayon kanina mamaya bukas kahapon noon dati muna agad lagi palagi minsan madalas
paki pakisuyo paano bakit saan kailan alin sino ilan gaano magkano tama mali mabuti maganda
mahusay magaling malinaw maayos mahalaga sapat kulang labis dagdag dagdagan bawas bawasan palitan
baguhin ayusin tingnan suriin basahin isulat sulatin gawin ginawa gagawin ginagawa paggawa
magawa makagawa ilagay inilagay idagdag tanggalin alisin ipaliwanag pagpapaliwanag paliwanag
halimbawa halimbawang aralin pagsusulit pagsusuri takdang gawain gawaing layunin layunin
paksa mga paksang estudyante estudyanteng mag-aaral magaaral guro gurong klase silid aklat
aklatan sanggunian sanggunian kurso asignatura marka grado proyekto ulat pananaliksik
pagtuturo pagkatuto natutunan matututo matuto turuan itinuturo kasanayan kaalaman pag-unawa
salamat maraming opo hello sige okay okey teka yung iyong yun nung noong nang ngang naman
ganyan diba hindi ba eh ewan kayang kayang-kaya parang tulad gaya katulad kagaya mismo
lahat bawat ibang iba isa dalawa tatlo apat lima anim pito walo siyam sampu una ikalawa
ikatlo huling huli simula simulan tapusin natapos matapos tuloy ituloy patuloy muli ulit
`

// Naga (Central) Bikol, the variety used around UNC.
const BIKOL = `
maray marhay salamat mabalos tabi garo baga ngani kaini digdi duman kaidto ngonyan ngunyan
siisay ngata pirmi pirang sarong duwang tolong dakol diit gabos saindo sainda samuya satuya
kamo sinda niya idto iyan kaiyan kaiyo kaini kaidto gibo ginibo gigibohon magibo pagibo ginigibo
pakiaram pakitabang tabang tabangan adal nag-adal naga-adal inaadalan pag-adal paaralan
eskwelahan maestro maestra estudyante klase harong aldaw banggi hapon kasuarin sagkod
alagad dangan tungod tibaad siguro gusto boot sabihon sinabi sinasabi taram tataramon
bako wara igwa mayo arog kaiba kaibahan matua magurang enot enoton sunod katapusan natapos
pagtapos tapos kaya kuyang ading manoy manay ining iyo-iyo totoo totoong tama sala kulang
dagdag dagdagan ilaag ibutang ibilang basahon isurat surat sinurat pagsurat aram naaraman
maaraman paliwanag ipaliwanag halimbawa aralon inaral nagaral pagsusuri ulay ulayon
tanganing para kaiyan pwede puwede dapat kaipuhan kaipuhan naman lang talaga daw palan
`

const toSet = (...lists) => new Set(lists.join(' ').toLowerCase().split(/\s+/).filter(word => word.length >= 4))

export const LOCAL_WORDS = toSet(FILIPINO, BIKOL)

export default LOCAL_WORDS
