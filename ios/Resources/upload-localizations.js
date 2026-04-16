#!/usr/bin/env node

import https from 'https';
import crypto from 'crypto';
import fs from 'fs';

// Configuration
const KEY_ID = 'F2P59D763T';
const ISSUER_ID = '51600d4a-1ff7-4a57-9da9-b109d357eb86';
const PRIVATE_KEY_PATH = '/Users/itsnappyboy/Downloads/AuthKey_F2P59D763T.p8';

// Product IDs to update
const PRODUCT_IDS = [
  'com.cartostar.pro.monthly',
  'com.cartostar.pro.annual',
  'com.cartostar.duo.monthly',
  'com.cartostar.duo.annual',
  'com.cartostar.lifetime'
];

// Localizations data - Subscription descriptions must be max 55 characters!
// Display names max 30 characters
const LOCALIZATIONS = {
  'com.cartostar.pro.monthly': {
    'en-US': { name: 'Pro Monthly', description: '3D globe, city Scout, AI chat. 50 questions/mo.' },
    'es-ES': { name: 'Pro Mensual', description: 'Globo 3D, Scout, chat IA. 50 preguntas/mes.' },
    'es-MX': { name: 'Pro Mensual', description: 'Globo 3D, Scout, chat IA. 50 preguntas/mes.' },
    'fr-FR': { name: 'Pro Mensuel', description: 'Globe 3D, Scout, chat IA. 50 questions/mois.' },
    'fr-CA': { name: 'Pro Mensuel', description: 'Globe 3D, Scout, chat IA. 50 questions/mois.' },
    'de-DE': { name: 'Pro Monatlich', description: '3D-Globus, Scout, KI-Chat. 50 Fragen/Monat.' },
    'it': { name: 'Pro Mensile', description: 'Globo 3D, Scout, chat IA. 50 domande/mese.' },
    'pt-BR': { name: 'Pro Mensal', description: 'Globo 3D, Scout, chat IA. 50 perguntas/mês.' },
    'pt-PT': { name: 'Pro Mensal', description: 'Globo 3D, Scout, chat IA. 50 perguntas/mês.' },
    'ja': { name: 'Pro 月額', description: '3D地球儀、Scout、AIチャット。月50回の質問。' },
    'ko': { name: 'Pro 월간', description: '3D 지구본, Scout, AI 채팅. 월 50개 질문.' },
    'zh-Hans': { name: 'Pro 月度', description: '3D地球仪、Scout、AI聊天。每月50个问题。' },
    'zh-Hant': { name: 'Pro 月費', description: '3D地球儀、Scout、AI聊天。每月50個問題。' },
    'ru': { name: 'Pro Ежемесячно', description: '3D-глобус, Scout, AI-чат. 50 вопросов/мес.' },
    'nl-NL': { name: 'Pro Maandelijks', description: '3D-globe, Scout, AI-chat. 50 vragen/maand.' },
    'pl': { name: 'Pro Miesięczny', description: 'Globus 3D, Scout, czat AI. 50 pytań/mies.' },
    'tr': { name: 'Pro Aylık', description: '3D küre, Scout, AI sohbet. Ayda 50 soru.' },
    'th': { name: 'Pro รายเดือน', description: 'ลูกโลก 3D, Scout, AI แชท. 50 คำถาม/เดือน' },
    'vi': { name: 'Pro Hàng Tháng', description: 'Địa cầu 3D, Scout, AI chat. 50 câu hỏi/tháng.' },
    'id': { name: 'Pro Bulanan', description: 'Globe 3D, Scout, chat AI. 50 pertanyaan/bulan.' },
    'ms': { name: 'Pro Bulanan', description: 'Glob 3D, Scout, chat AI. 50 soalan/bulan.' },
    'ar': { name: 'Pro شهري', description: 'كرة 3D، Scout، دردشة AI. 50 سؤال/شهر.' },
    'hi': { name: 'Pro मासिक', description: '3D ग्लोब, Scout, AI चैट। 50 प्रश्न/माह।' },
    'sv': { name: 'Pro Månadsvis', description: '3D-glob, Scout, AI-chatt. 50 frågor/månad.' },
    'da': { name: 'Pro Månedlig', description: '3D-globus, Scout, AI-chat. 50 spørgsmål/md.' },
    'nb': { name: 'Pro Månedlig', description: '3D-globus, Scout, AI-chat. 50 spørsmål/mnd.' },
    'fi': { name: 'Pro Kuukausittain', description: '3D-pallo, Scout, AI-chat. 50 kysymystä/kk.' },
    'cs': { name: 'Pro Měsíčně', description: '3D globus, Scout, AI chat. 50 otázek/měsíc.' },
    'el': { name: 'Pro Μηνιαίο', description: '3D υδρόγειος, Scout, AI chat. 50 ερωτήσεις/μήνα.' },
    'he': { name: 'Pro חודשי', description: 'גלובוס 3D, Scout, AI צ\'אט. 50 שאלות/חודש.' },
    'uk': { name: 'Pro Щомісяця', description: '3D-глобус, Scout, AI-чат. 50 питань/міс.' },
    'ro': { name: 'Pro Lunar', description: 'Glob 3D, Scout, chat AI. 50 întrebări/lună.' },
    'hu': { name: 'Pro Havi', description: '3D földgömb, Scout, AI chat. 50 kérdés/hó.' },
    'sk': { name: 'Pro Mesačne', description: '3D glóbus, Scout, AI chat. 50 otázok/mesiac.' },
    'hr': { name: 'Pro Mjesečno', description: '3D globus, Scout, AI chat. 50 pitanja/mj.' },
    'ca': { name: 'Pro Mensual', description: 'Globus 3D, Scout, xat IA. 50 preguntes/mes.' },
    'en-GB': { name: 'Pro Monthly', description: '3D globe, city Scout, AI chat. 50 questions/mo.' },
    'en-AU': { name: 'Pro Monthly', description: '3D globe, city Scout, AI chat. 50 questions/mo.' },
  },
  'com.cartostar.pro.annual': {
    'en-US': { name: 'Pro Annual', description: '3D globe, city Scout, AI chat. Save 50%.' },
    'es-ES': { name: 'Pro Anual', description: 'Globo 3D, Scout, chat IA. Ahorra 50%.' },
    'es-MX': { name: 'Pro Anual', description: 'Globo 3D, Scout, chat IA. Ahorra 50%.' },
    'fr-FR': { name: 'Pro Annuel', description: 'Globe 3D, Scout, chat IA. Économisez 50%.' },
    'fr-CA': { name: 'Pro Annuel', description: 'Globe 3D, Scout, chat IA. Économisez 50%.' },
    'de-DE': { name: 'Pro Jährlich', description: '3D-Globus, Scout, KI-Chat. 50% sparen.' },
    'it': { name: 'Pro Annuale', description: 'Globo 3D, Scout, chat IA. Risparmia 50%.' },
    'pt-BR': { name: 'Pro Anual', description: 'Globo 3D, Scout, chat IA. Economize 50%.' },
    'pt-PT': { name: 'Pro Anual', description: 'Globo 3D, Scout, chat IA. Poupe 50%.' },
    'ja': { name: 'Pro 年額', description: '3D地球儀、Scout、AIチャット。50%お得。' },
    'ko': { name: 'Pro 연간', description: '3D 지구본, Scout, AI 채팅. 50% 절약.' },
    'zh-Hans': { name: 'Pro 年度', description: '3D地球仪、Scout、AI聊天。节省50%。' },
    'zh-Hant': { name: 'Pro 年費', description: '3D地球儀、Scout、AI聊天。節省50%。' },
    'ru': { name: 'Pro Ежегодно', description: '3D-глобус, Scout, AI-чат. Экономия 50%.' },
    'nl-NL': { name: 'Pro Jaarlijks', description: '3D-globe, Scout, AI-chat. Bespaar 50%.' },
    'pl': { name: 'Pro Roczny', description: 'Globus 3D, Scout, czat AI. Oszczędź 50%.' },
    'tr': { name: 'Pro Yıllık', description: '3D küre, Scout, AI sohbet. %50 tasarruf.' },
    'th': { name: 'Pro รายปี', description: 'ลูกโลก 3D, Scout, AI แชท. ประหยัด 50%' },
    'vi': { name: 'Pro Hàng Năm', description: 'Địa cầu 3D, Scout, AI chat. Tiết kiệm 50%.' },
    'id': { name: 'Pro Tahunan', description: 'Globe 3D, Scout, chat AI. Hemat 50%.' },
    'ms': { name: 'Pro Tahunan', description: 'Glob 3D, Scout, chat AI. Jimat 50%.' },
    'ar': { name: 'Pro سنوي', description: 'كرة 3D، Scout، دردشة AI. وفر 50%.' },
    'hi': { name: 'Pro वार्षिक', description: '3D ग्लोब, Scout, AI चैट। 50% बचत।' },
    'sv': { name: 'Pro Årsvis', description: '3D-glob, Scout, AI-chatt. Spara 50%.' },
    'da': { name: 'Pro Årlig', description: '3D-globus, Scout, AI-chat. Spar 50%.' },
    'nb': { name: 'Pro Årlig', description: '3D-globus, Scout, AI-chat. Spar 50%.' },
    'fi': { name: 'Pro Vuosittain', description: '3D-pallo, Scout, AI-chat. Säästä 50%.' },
    'cs': { name: 'Pro Ročně', description: '3D globus, Scout, AI chat. Ušetřete 50%.' },
    'el': { name: 'Pro Ετήσιο', description: '3D υδρόγειος, Scout, AI chat. Εξοικονομήστε 50%.' },
    'he': { name: 'Pro שנתי', description: 'גלובוס 3D, Scout, AI צ\'אט. חסוך 50%.' },
    'uk': { name: 'Pro Щорічно', description: '3D-глобус, Scout, AI-чат. Економія 50%.' },
    'ro': { name: 'Pro Anual', description: 'Glob 3D, Scout, chat AI. Economisește 50%.' },
    'hu': { name: 'Pro Éves', description: '3D földgömb, Scout, AI chat. 50% megtakarítás.' },
    'sk': { name: 'Pro Ročne', description: '3D glóbus, Scout, AI chat. Ušetrite 50%.' },
    'hr': { name: 'Pro Godišnje', description: '3D globus, Scout, AI chat. Uštedite 50%.' },
    'ca': { name: 'Pro Anual', description: 'Globus 3D, Scout, xat IA. Estalvia 50%.' },
    'en-GB': { name: 'Pro Annual', description: '3D globe, city Scout, AI chat. Save 50%.' },
    'en-AU': { name: 'Pro Annual', description: '3D globe, city Scout, AI chat. Save 50%.' },
  },
  'com.cartostar.duo.monthly': {
    'en-US': { name: 'Duo Monthly', description: 'Pro + partner mode. 100 AI questions/mo.' },
    'es-ES': { name: 'Duo Mensual', description: 'Pro + modo pareja. 100 preguntas IA/mes.' },
    'es-MX': { name: 'Duo Mensual', description: 'Pro + modo pareja. 100 preguntas IA/mes.' },
    'fr-FR': { name: 'Duo Mensuel', description: 'Pro + mode couple. 100 questions IA/mois.' },
    'fr-CA': { name: 'Duo Mensuel', description: 'Pro + mode couple. 100 questions IA/mois.' },
    'de-DE': { name: 'Duo Monatlich', description: 'Pro + Partner-Modus. 100 KI-Fragen/Monat.' },
    'it': { name: 'Duo Mensile', description: 'Pro + modalità coppia. 100 domande IA/mese.' },
    'pt-BR': { name: 'Duo Mensal', description: 'Pro + modo casal. 100 perguntas IA/mês.' },
    'pt-PT': { name: 'Duo Mensal', description: 'Pro + modo casal. 100 perguntas IA/mês.' },
    'ja': { name: 'Duo 月額', description: 'Pro + パートナーモード。月100回のAI質問。' },
    'ko': { name: 'Duo 월간', description: 'Pro + 파트너 모드. 월 100개 AI 질문.' },
    'zh-Hans': { name: 'Duo 月度', description: 'Pro + 伴侣模式。每月100个AI问题。' },
    'zh-Hant': { name: 'Duo 月費', description: 'Pro + 伴侶模式。每月100個AI問題。' },
    'ru': { name: 'Duo Ежемесячно', description: 'Pro + режим пары. 100 AI-вопросов/мес.' },
    'nl-NL': { name: 'Duo Maandelijks', description: 'Pro + partnermodus. 100 AI-vragen/maand.' },
    'pl': { name: 'Duo Miesięczny', description: 'Pro + tryb pary. 100 pytań AI/miesiąc.' },
    'tr': { name: 'Duo Aylık', description: 'Pro + partner modu. Ayda 100 AI sorusu.' },
    'th': { name: 'Duo รายเดือน', description: 'Pro + โหมดคู่รัก. 100 AI คำถาม/เดือน' },
    'vi': { name: 'Duo Hàng Tháng', description: 'Pro + chế độ cặp đôi. 100 câu AI/tháng.' },
    'id': { name: 'Duo Bulanan', description: 'Pro + mode pasangan. 100 pertanyaan AI/bln.' },
    'ms': { name: 'Duo Bulanan', description: 'Pro + mod pasangan. 100 soalan AI/bulan.' },
    'ar': { name: 'Duo شهري', description: 'Pro + وضع الشريك. 100 سؤال AI/شهر.' },
    'hi': { name: 'Duo मासिक', description: 'Pro + साथी मोड। 100 AI प्रश्न/माह।' },
    'sv': { name: 'Duo Månadsvis', description: 'Pro + partnerläge. 100 AI-frågor/månad.' },
    'da': { name: 'Duo Månedlig', description: 'Pro + partnertilstand. 100 AI-spørgsmål/md.' },
    'nb': { name: 'Duo Månedlig', description: 'Pro + partnermodus. 100 AI-spørsmål/mnd.' },
    'fi': { name: 'Duo Kuukausittain', description: 'Pro + paritila. 100 AI-kysymystä/kk.' },
    'cs': { name: 'Duo Měsíčně', description: 'Pro + partnerský režim. 100 AI otázek/měs.' },
    'el': { name: 'Duo Μηνιαίο', description: 'Pro + λειτουργία ζευγαριού. 100 AI ερωτ/μήνα.' },
    'he': { name: 'Duo חודשי', description: 'Pro + מצב זוג. 100 שאלות AI/חודש.' },
    'uk': { name: 'Duo Щомісяця', description: 'Pro + режим пари. 100 AI-питань/міс.' },
    'ro': { name: 'Duo Lunar', description: 'Pro + mod cuplu. 100 întrebări AI/lună.' },
    'hu': { name: 'Duo Havi', description: 'Pro + pár mód. 100 AI kérdés/hó.' },
    'sk': { name: 'Duo Mesačne', description: 'Pro + párový režim. 100 AI otázok/mesiac.' },
    'hr': { name: 'Duo Mjesečno', description: 'Pro + par način. 100 AI pitanja/mj.' },
    'ca': { name: 'Duo Mensual', description: 'Pro + mode parella. 100 preguntes IA/mes.' },
    'en-GB': { name: 'Duo Monthly', description: 'Pro + partner mode. 100 AI questions/mo.' },
    'en-AU': { name: 'Duo Monthly', description: 'Pro + partner mode. 100 AI questions/mo.' },
  },
  'com.cartostar.duo.annual': {
    'en-US': { name: 'Duo Annual', description: 'Pro + partner mode. 100 AI questions. Save 50%.' },
    'es-ES': { name: 'Duo Anual', description: 'Pro + modo pareja. 100 preguntas IA. Ahorra 50%.' },
    'es-MX': { name: 'Duo Anual', description: 'Pro + modo pareja. 100 preguntas IA. Ahorra 50%.' },
    'fr-FR': { name: 'Duo Annuel', description: 'Pro + mode couple. 100 questions IA. -50%.' },
    'fr-CA': { name: 'Duo Annuel', description: 'Pro + mode couple. 100 questions IA. -50%.' },
    'de-DE': { name: 'Duo Jährlich', description: 'Pro + Partner-Modus. 100 KI-Fragen. 50% sparen.' },
    'it': { name: 'Duo Annuale', description: 'Pro + modalità coppia. 100 domande IA. -50%.' },
    'pt-BR': { name: 'Duo Anual', description: 'Pro + modo casal. 100 perguntas IA. -50%.' },
    'pt-PT': { name: 'Duo Anual', description: 'Pro + modo casal. 100 perguntas IA. Poupe 50%.' },
    'ja': { name: 'Duo 年額', description: 'Pro + パートナーモード。100 AI質問。50%お得。' },
    'ko': { name: 'Duo 연간', description: 'Pro + 파트너 모드. 100 AI 질문. 50% 절약.' },
    'zh-Hans': { name: 'Duo 年度', description: 'Pro + 伴侣模式。100 AI问题。节省50%。' },
    'zh-Hant': { name: 'Duo 年費', description: 'Pro + 伴侶模式。100 AI問題。節省50%。' },
    'ru': { name: 'Duo Ежегодно', description: 'Pro + режим пары. 100 AI-вопросов. -50%.' },
    'nl-NL': { name: 'Duo Jaarlijks', description: 'Pro + partnermodus. 100 AI-vragen. Bespaar 50%.' },
    'pl': { name: 'Duo Roczny', description: 'Pro + tryb pary. 100 pytań AI. Oszczędź 50%.' },
    'tr': { name: 'Duo Yıllık', description: 'Pro + partner modu. 100 AI sorusu. %50 tasarruf.' },
    'th': { name: 'Duo รายปี', description: 'Pro + โหมดคู่รัก. 100 AI คำถาม. ประหยัด 50%' },
    'vi': { name: 'Duo Hàng Năm', description: 'Pro + chế độ cặp đôi. 100 câu AI. Tiết kiệm 50%.' },
    'id': { name: 'Duo Tahunan', description: 'Pro + mode pasangan. 100 pertanyaan AI. Hemat 50%.' },
    'ms': { name: 'Duo Tahunan', description: 'Pro + mod pasangan. 100 soalan AI. Jimat 50%.' },
    'ar': { name: 'Duo سنوي', description: 'Pro + وضع الشريك. 100 سؤال AI. وفر 50%.' },
    'hi': { name: 'Duo वार्षिक', description: 'Pro + साथी मोड। 100 AI प्रश्न। 50% बचत।' },
    'sv': { name: 'Duo Årsvis', description: 'Pro + partnerläge. 100 AI-frågor. Spara 50%.' },
    'da': { name: 'Duo Årlig', description: 'Pro + partnertilstand. 100 AI-spørgsmål. Spar 50%.' },
    'nb': { name: 'Duo Årlig', description: 'Pro + partnermodus. 100 AI-spørsmål. Spar 50%.' },
    'fi': { name: 'Duo Vuosittain', description: 'Pro + paritila. 100 AI-kysymystä. Säästä 50%.' },
    'cs': { name: 'Duo Ročně', description: 'Pro + partnerský režim. 100 AI otázek. -50%.' },
    'el': { name: 'Duo Ετήσιο', description: 'Pro + λειτουργία ζευγαριού. 100 AI ερωτ. -50%.' },
    'he': { name: 'Duo שנתי', description: 'Pro + מצב זוג. 100 שאלות AI. חסוך 50%.' },
    'uk': { name: 'Duo Щорічно', description: 'Pro + режим пари. 100 AI-питань. -50%.' },
    'ro': { name: 'Duo Anual', description: 'Pro + mod cuplu. 100 întrebări AI. -50%.' },
    'hu': { name: 'Duo Éves', description: 'Pro + pár mód. 100 AI kérdés. 50% megtakarítás.' },
    'sk': { name: 'Duo Ročne', description: 'Pro + párový režim. 100 AI otázok. -50%.' },
    'hr': { name: 'Duo Godišnje', description: 'Pro + par način. 100 AI pitanja. Uštedite 50%.' },
    'ca': { name: 'Duo Anual', description: 'Pro + mode parella. 100 preguntes IA. -50%.' },
    'en-GB': { name: 'Duo Annual', description: 'Pro + partner mode. 100 AI questions. Save 50%.' },
    'en-AU': { name: 'Duo Annual', description: 'Pro + partner mode. 100 AI questions. Save 50%.' },
  },
  'com.cartostar.lifetime': {
    'en-US': { name: 'Lifetime', description: 'All features forever. One-time purchase. 200 AI Q.' },
    'es-ES': { name: 'Vitalicio', description: 'Todas las funciones para siempre. Compra única.' },
    'es-MX': { name: 'Vitalicio', description: 'Todas las funciones para siempre. Compra única.' },
    'fr-FR': { name: 'À Vie', description: 'Toutes les fonctions à vie. Achat unique.' },
    'fr-CA': { name: 'À Vie', description: 'Toutes les fonctions à vie. Achat unique.' },
    'de-DE': { name: 'Lebenslang', description: 'Alle Funktionen für immer. Einmaliger Kauf.' },
    'it': { name: 'A Vita', description: 'Tutte le funzioni per sempre. Acquisto unico.' },
    'pt-BR': { name: 'Vitalício', description: 'Todos os recursos para sempre. Compra única.' },
    'pt-PT': { name: 'Vitalício', description: 'Todas as funções para sempre. Compra única.' },
    'ja': { name: '永久版', description: '全機能を永久に。一回限りの購入。200 AI質問。' },
    'ko': { name: '평생', description: '모든 기능 영구. 일회성 구매. 200 AI 질문.' },
    'zh-Hans': { name: '终身版', description: '所有功能永久使用。一次性购买。200 AI问题。' },
    'zh-Hant': { name: '終身版', description: '所有功能永久使用。一次性購買。200 AI問題。' },
    'ru': { name: 'Навсегда', description: 'Все функции навсегда. Единовременная покупка.' },
    'nl-NL': { name: 'Levenslang', description: 'Alle functies voor altijd. Eenmalige aankoop.' },
    'pl': { name: 'Na Zawsze', description: 'Wszystkie funkcje na zawsze. Jednorazowy zakup.' },
    'tr': { name: 'Ömür Boyu', description: 'Tüm özellikler sonsuza dek. Tek seferlik satın alma.' },
    'th': { name: 'ตลอดชีพ', description: 'ทุกฟีเจอร์ตลอดกาล ซื้อครั้งเดียว 200 AI คำถาม' },
    'vi': { name: 'Vĩnh Viễn', description: 'Tất cả tính năng mãi mãi. Mua một lần.' },
    'id': { name: 'Seumur Hidup', description: 'Semua fitur selamanya. Pembelian satu kali.' },
    'ms': { name: 'Seumur Hidup', description: 'Semua ciri selamanya. Pembelian sekali.' },
    'ar': { name: 'مدى الحياة', description: 'جميع الميزات للأبد. شراء لمرة واحدة.' },
    'hi': { name: 'आजीवन', description: 'सभी सुविधाएं हमेशा के लिए। एकमुश्त खरीदारी।' },
    'sv': { name: 'Livstid', description: 'Alla funktioner för alltid. Engångsköp.' },
    'da': { name: 'Livstid', description: 'Alle funktioner for altid. Engangskøb.' },
    'nb': { name: 'Livstid', description: 'Alle funksjoner for alltid. Engangskjøp.' },
    'fi': { name: 'Elinikäinen', description: 'Kaikki ominaisuudet ikuisesti. Kertaosto.' },
    'cs': { name: 'Doživotní', description: 'Všechny funkce navždy. Jednorázový nákup.' },
    'el': { name: 'Εφ\' Όρου Ζωής', description: 'Όλες οι λειτουργίες για πάντα. Εφάπαξ αγορά.' },
    'he': { name: 'לכל החיים', description: 'כל התכונות לנצח. רכישה חד פעמית.' },
    'uk': { name: 'Назавжди', description: 'Усі функції назавжди. Одноразова покупка.' },
    'ro': { name: 'Pe Viață', description: 'Toate funcțiile pentru totdeauna. Achiziție unică.' },
    'hu': { name: 'Élethosszig', description: 'Minden funkció örökre. Egyszeri vásárlás.' },
    'sk': { name: 'Doživotne', description: 'Všetky funkcie navždy. Jednorazový nákup.' },
    'hr': { name: 'Doživotno', description: 'Sve značajke zauvijek. Jednokratna kupnja.' },
    'ca': { name: 'Vitalici', description: 'Totes les funcions per sempre. Compra única.' },
    'en-GB': { name: 'Lifetime', description: 'All features forever. One-time purchase. 200 AI Q.' },
    'en-AU': { name: 'Lifetime', description: 'All features forever. One-time purchase. 200 AI Q.' },
  }
};

// Generate JWT token
function generateJWT() {
  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

  const header = {
    alg: 'ES256',
    kid: KEY_ID,
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: ISSUER_ID,
    iat: now,
    exp: now + 1200, // 20 minutes
    aud: 'appstoreconnect-v1'
  };

  const headerBase64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${headerBase64}.${payloadBase64}`;

  const sign = crypto.createSign('SHA256');
  sign.update(signingInput);
  const signature = sign.sign(privateKey);

  // Convert DER signature to raw r||s format for ES256
  const derSignature = signature;
  let r, s;

  // Parse DER format
  let offset = 2; // Skip sequence header
  if (derSignature[1] > 0x80) offset += derSignature[1] - 0x80;
  offset++; // Skip integer tag for r

  let rLen = derSignature[offset++];
  if (rLen > 0x80) {
    const lenBytes = rLen - 0x80;
    rLen = 0;
    for (let i = 0; i < lenBytes; i++) {
      rLen = (rLen << 8) | derSignature[offset++];
    }
  }

  r = derSignature.slice(offset, offset + rLen);
  offset += rLen;

  offset++; // Skip integer tag for s
  let sLen = derSignature[offset++];
  if (sLen > 0x80) {
    const lenBytes = sLen - 0x80;
    sLen = 0;
    for (let i = 0; i < lenBytes; i++) {
      sLen = (sLen << 8) | derSignature[offset++];
    }
  }

  s = derSignature.slice(offset, offset + sLen);

  // Pad/trim to 32 bytes each
  const padOrTrim = (buf, len) => {
    if (buf.length === len) return buf;
    if (buf.length > len) return buf.slice(buf.length - len);
    const padded = Buffer.alloc(len);
    buf.copy(padded, len - buf.length);
    return padded;
  };

  r = padOrTrim(r, 32);
  s = padOrTrim(s, 32);

  const rawSignature = Buffer.concat([r, s]);
  const signatureBase64 = rawSignature.toString('base64url');

  return `${headerBase64}.${payloadBase64}.${signatureBase64}`;
}

// Make API request
function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const token = generateJWT();

    const options = {
      hostname: 'api.appstoreconnect.apple.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 400) {
            console.error(`API Error ${res.statusCode}:`, JSON.stringify(parsed, null, 2));
            reject(new Error(`API Error ${res.statusCode}: ${JSON.stringify(parsed)}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          if (res.statusCode >= 400) {
            reject(new Error(`API Error ${res.statusCode}: ${data}`));
          } else {
            resolve(data);
          }
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Get app ID
async function getAppId() {
  console.log('Fetching app...');
  const response = await apiRequest('GET', '/v1/apps?filter[bundleId]=llc.teamchai.cartostar');
  if (response.data && response.data.length > 0) {
    return response.data[0].id;
  }
  throw new Error('App not found');
}

// Get subscription groups
async function getSubscriptionGroups(appId) {
  console.log('Fetching subscription groups...');
  const response = await apiRequest('GET', `/v1/apps/${appId}/subscriptionGroups`);
  return response.data || [];
}

// Get subscriptions in a group
async function getSubscriptions(groupId) {
  console.log(`Fetching subscriptions for group ${groupId}...`);
  const response = await apiRequest('GET', `/v1/subscriptionGroups/${groupId}/subscriptions`);
  return response.data || [];
}

// Get in-app purchases (for lifetime)
async function getInAppPurchases(appId) {
  console.log('Fetching in-app purchases...');
  const response = await apiRequest('GET', `/v1/apps/${appId}/inAppPurchasesV2`);
  return response.data || [];
}

// Get existing localizations for a subscription
async function getSubscriptionLocalizations(subscriptionId) {
  const response = await apiRequest('GET', `/v1/subscriptions/${subscriptionId}/subscriptionLocalizations`);
  return response.data || [];
}

// Get existing localizations for an IAP
async function getIAPLocalizations(iapId) {
  const response = await apiRequest('GET', `/v1/inAppPurchasesV2/${iapId}/inAppPurchaseLocalizations`);
  return response.data || [];
}

// Create or update subscription localization
async function updateSubscriptionLocalization(subscriptionId, locale, name, description) {
  // First check if localization exists
  const existing = await getSubscriptionLocalizations(subscriptionId);
  const existingLoc = existing.find(l => l.attributes.locale === locale);

  if (existingLoc) {
    // Update existing
    console.log(`  Updating ${locale}...`);
    await apiRequest('PATCH', `/v1/subscriptionLocalizations/${existingLoc.id}`, {
      data: {
        type: 'subscriptionLocalizations',
        id: existingLoc.id,
        attributes: {
          name: name,
          description: description
        }
      }
    });
  } else {
    // Create new
    console.log(`  Creating ${locale}...`);
    await apiRequest('POST', '/v1/subscriptionLocalizations', {
      data: {
        type: 'subscriptionLocalizations',
        attributes: {
          locale: locale,
          name: name,
          description: description
        },
        relationships: {
          subscription: {
            data: {
              type: 'subscriptions',
              id: subscriptionId
            }
          }
        }
      }
    });
  }
}

// Create or update IAP localization
async function updateIAPLocalization(iapId, locale, name, description) {
  // First check if localization exists
  let existing = [];
  try {
    existing = await getIAPLocalizations(iapId);
  } catch (e) {
    // IAP might not have localizations endpoint, try alternative
    console.log(`  Note: Could not fetch existing localizations for IAP`);
  }
  const existingLoc = existing.find(l => l.attributes && l.attributes.locale === locale);

  if (existingLoc) {
    // Update existing
    console.log(`  Updating ${locale}...`);
    await apiRequest('PATCH', `/v1/inAppPurchaseLocalizations/${existingLoc.id}`, {
      data: {
        type: 'inAppPurchaseLocalizations',
        id: existingLoc.id,
        attributes: {
          name: name,
          description: description
        }
      }
    });
  } else {
    // Create new - try both API endpoint formats
    console.log(`  Creating ${locale}...`);
    try {
      await apiRequest('POST', '/v1/inAppPurchaseLocalizations', {
        data: {
          type: 'inAppPurchaseLocalizations',
          attributes: {
            locale: locale,
            name: name,
            description: description
          },
          relationships: {
            inAppPurchaseV2: {
              data: {
                type: 'inAppPurchases',
                id: iapId
              }
            }
          }
        }
      });
    } catch (e) {
      // If v2 endpoint fails, IAP localizations may need to be set via App Store Connect UI
      console.log(`  Note: IAP localization API not available for ${locale}. Set via App Store Connect.`);
    }
  }
}

// Main function
async function main() {
  try {
    console.log('=== App Store Connect Localization Uploader ===\n');

    // Get app
    const appId = await getAppId();
    console.log(`Found app: ${appId}\n`);

    // Get subscription groups and subscriptions
    const groups = await getSubscriptionGroups(appId);
    console.log(`Found ${groups.length} subscription groups\n`);

    const subscriptionMap = {};

    for (const group of groups) {
      const subs = await getSubscriptions(group.id);
      for (const sub of subs) {
        const productId = sub.attributes.productId;
        subscriptionMap[productId] = { id: sub.id, type: 'subscription' };
        console.log(`Found subscription: ${productId} (${sub.id})`);
      }
    }

    // Get IAPs
    const iaps = await getInAppPurchases(appId);
    for (const iap of iaps) {
      const productId = iap.attributes.productId;
      subscriptionMap[productId] = { id: iap.id, type: 'iap' };
      console.log(`Found IAP: ${productId} (${iap.id})`);
    }

    console.log('\n=== Updating Localizations ===\n');

    // Update each product
    for (const productId of PRODUCT_IDS) {
      const product = subscriptionMap[productId];

      if (!product) {
        console.log(`\n[SKIP] Product not found: ${productId}`);
        continue;
      }

      console.log(`\n[${productId}]`);

      const localizations = LOCALIZATIONS[productId];
      if (!localizations) {
        console.log('  No localizations defined, skipping...');
        continue;
      }

      for (const [locale, { name, description }] of Object.entries(localizations)) {
        try {
          if (product.type === 'subscription') {
            await updateSubscriptionLocalization(product.id, locale, name, description);
          } else {
            await updateIAPLocalization(product.id, locale, name, description);
          }
        } catch (error) {
          console.error(`  Error updating ${locale}: ${error.message}`);
        }

        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log('\n=== Done ===');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
