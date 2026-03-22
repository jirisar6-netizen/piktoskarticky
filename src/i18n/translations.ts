// ─── src/i18n/translations.ts ─────────────────────────────────────────────
//
// Překlady pro cs / sk / en.
// Typový systém zajišťuje, že SK a EN mají vždy stejné klíče jako CS.
//
// Přidání nového textu:
//   1. Přidej klíč do TranslationSchema
//   2. Přidej překlad do cs, sk, en objektu

// ── Schéma (definuje všechny klíče) ──────────────────────────────────────
export interface TranslationSchema {
  // ── Navigace ────────────────────────────────────────────────────────
  nav_dashboard:    string;
  nav_communicator: string;
  nav_sos:          string;
  nav_about:        string;
  nav_search:       string;
  nav_settings:     string;

  // ── Dashboard ────────────────────────────────────────────────────────
  dash_sentence_placeholder: string;
  dash_speak_all:            string;
  dash_clear_sentence:       string;
  dash_search_placeholder:   string;
  dash_upcoming:             string;

  // ── SmartBar / denní doby ────────────────────────────────────────────
  time_morning:  string;
  time_day:      string;
  time_evening:  string;
  time_night:    string;
  smartbar_hint: string;

  // ── Piktogram kategorie ─────────────────────────────────────────────
  cat_breakfast:  string;
  cat_hygiene:    string;
  cat_dressing:   string;
  cat_play:       string;
  cat_learning:   string;
  cat_outside:    string;
  cat_food:       string;
  cat_dinner:     string;
  cat_bath:       string;
  cat_sleep:      string;
  cat_night:      string;

  // ── Piktogram popisky (SOS) ─────────────────────────────────────────
  sos_hurt:       string;
  sos_stop:       string;
  sos_quiet:      string;
  sos_help:       string;
  sos_hurt_sub:   string;
  sos_stop_sub:   string;
  sos_quiet_sub:  string;
  sos_help_sub:   string;

  // ── SOS stránka ─────────────────────────────────────────────────────
  sos_title:      string;
  sos_subtitle:   string;
  sos_exit_label: string;
  sos_hold_hint:  string;

  // ── Vyhledávání ─────────────────────────────────────────────────────
  search_placeholder:  string;
  search_empty_title:  string;
  search_empty_sub:    string;
  search_error_retry:  string;
  search_results:      string;    // "{n} výsledků pro"
  search_examples:     string;    // návrhy kliknutelných slov

  // ── Hlasová syntéza ─────────────────────────────────────────────────
  voice_speak:    string;
  voice_stop:     string;
  voice_unsupported: string;

  // ── Nahrávání ────────────────────────────────────────────────────────
  rec_title:      string;
  rec_existing:   string;
  rec_rerecord:   string;
  rec_delete:     string;
  rec_prepare:    string;
  rec_recording:  string;
  rec_done_btn:   string;
  rec_saved:      string;
  rec_error:      string;

  // ── Rodičovský zámek ─────────────────────────────────────────────────
  lock_title:     string;
  lock_subtitle:  string;
  lock_confirm:   string;
  lock_cancel:    string;
  lock_wrong:     string;
  lock_hold_hint: string;
  lock_enter_calc: string;

  // ── Cloud sync ──────────────────────────────────────────────────────
  sync_title:     string;
  sync_synced:    string;
  sync_offline:   string;
  sync_syncing:   string;
  sync_error:     string;
  sync_pull:      string;
  sync_push:      string;
  sync_last:      string;    // "Poslední sync:"
  sync_items:     string;    // "položek"
  sync_url_label: string;
  sync_url_save:  string;

  // ── Offline banner ──────────────────────────────────────────────────
  offline_msg:    string;
  online_back:    string;

  // ── Chybové stavy ───────────────────────────────────────────────────
  error_restart:    string;
  error_back:       string;
  error_log_title:  string;
  error_log_clear:  string;
  error_occurred:   string;
  error_safe:       string;

  // ── Obecné ──────────────────────────────────────────────────────────
  action_close:   string;
  action_save:    string;
  action_delete:  string;
  action_cancel:  string;
  action_confirm: string;
  action_refresh: string;
  hold_to:        string;    // "Podržet pro"
  language_label: string;
  language_name:  string;    // vlastní jméno jazyka ("Čeština")
}

// ── ČEŠTINA ────────────────────────────────────────────────────────────────
const cs: TranslationSchema = {
  nav_dashboard:    "Dashboard",
  nav_communicator: "Komunikátor",
  nav_sos:          "SOS",
  nav_about:        "O projektu",
  nav_search:       "Vyhledávání",
  nav_settings:     "Nastavení",

  dash_sentence_placeholder: "Vyber piktogramy pro sestavení věty…",
  dash_speak_all:            "Přečíst větu",
  dash_clear_sentence:       "Vymazat",
  dash_search_placeholder:   "Hledej piktogram…",
  dash_upcoming:             "Rychlé volby",

  time_morning:  "Dobré ráno",
  time_day:      "Dobrý den",
  time_evening:  "Dobrý večer",
  time_night:    "Dobrou noc",
  smartbar_hint: "rychlé volby",

  cat_breakfast: "Snídaně",
  cat_hygiene:   "Hygiena",
  cat_dressing:  "Oblékání",
  cat_play:      "Hra",
  cat_learning:  "Učení",
  cat_outside:   "Venku",
  cat_food:      "Jídlo",
  cat_dinner:    "Večeře",
  cat_bath:      "Koupání",
  cat_sleep:     "Spánek",
  cat_night:     "Noc",

  sos_hurt:      "BOLÍ",
  sos_stop:      "STOP",
  sos_quiet:     "TICHO",
  sos_help:      "POMOC",
  sos_hurt_sub:  "Bolí mě",
  sos_stop_sub:  "Chci pryč",
  sos_quiet_sub: "Potřebuji klid",
  sos_help_sub:  "Potřebuji pomoct",

  sos_title:      "Guardian SOS",
  sos_subtitle:   "Vyber, co potřebuješ",
  sos_exit_label: "Ukončit SOS režim",
  sos_hold_hint:  "držet",

  search_placeholder: "Hledej… (jíst, pes, škola, pomoc)",
  search_empty_title: "Nic nenalezeno",
  search_empty_sub:   "Zkus jiné slovo nebo kratší výraz",
  search_error_retry: "Zkusit znovu",
  search_results:     "výsledků pro",
  search_examples:    "jíst|pes|škola|bolest|pomoc",

  voice_speak:       "Přečíst",
  voice_stop:        "Zastavit",
  voice_unsupported: "Hlasová syntéza není dostupná",

  rec_title:     "Vlastní nahrávka",
  rec_existing:  "Nahrávka existuje",
  rec_rerecord:  "Přenahrát",
  rec_delete:    "Smazat",
  rec_prepare:   "připrav se…",
  rec_recording: "NAHRÁVÁM",
  rec_done_btn:  "Hotovo",
  rec_saved:     "Uloženo!",
  rec_error:     "Chyba nahrávání",

  lock_title:      "Rodičovské ověření",
  lock_subtitle:   "Vyřeš příklad pro přístup do nastavení",
  lock_confirm:    "Potvrdit",
  lock_cancel:     "Zrušit",
  lock_wrong:      "Špatná odpověď – zkus nový příklad",
  lock_hold_hint:  "Nebo podržte tlačítko zámku 3 sekundy",
  lock_enter_calc: "Zadat výpočet",

  sync_title:   "Cloud Sync",
  sync_synced:  "Synchronizováno",
  sync_offline: "Offline",
  sync_syncing: "Synchronizuje…",
  sync_error:   "Chyba synchronizace",
  sync_pull:    "↻ Aktualizovat",
  sync_push:    "⬆ Nahrát změny",
  sync_last:    "Poslední sync:",
  sync_items:   "položek",
  sync_url_label: "Apps Script URL",
  sync_url_save:  "Uložit",

  offline_msg:  "📶 Offline – načtené piktogramy jsou k dispozici z cache",
  online_back:  "✓ Připojení obnoveno",

  error_restart:   "↻ Restartovat aplikaci",
  error_back:      "← Dashboard",
  error_log_title: "Chybový log",
  error_log_clear: "Smazat",
  error_occurred:  "Něco se pokazilo",
  error_safe:      "Tvoje data jsou v bezpečí – restart pomůže.",

  action_close:   "Zavřít",
  action_save:    "Uložit",
  action_delete:  "Smazat",
  action_cancel:  "Zrušit",
  action_confirm: "Potvrdit",
  action_refresh: "Obnovit",
  hold_to:        "Podržet pro",
  language_label: "Jazyk",
  language_name:  "Čeština",
};

// ── SLOVENŠTINA ────────────────────────────────────────────────────────────
const sk: TranslationSchema = {
  nav_dashboard:    "Dashboard",
  nav_communicator: "Komunikátor",
  nav_sos:          "SOS",
  nav_about:        "O projekte",
  nav_search:       "Vyhľadávanie",
  nav_settings:     "Nastavenia",

  dash_sentence_placeholder: "Vyber piktogramy na zostavenie vety…",
  dash_speak_all:            "Prečítať vetu",
  dash_clear_sentence:       "Vymazať",
  dash_search_placeholder:   "Hľadaj piktogram…",
  dash_upcoming:             "Rýchle voľby",

  time_morning:  "Dobré ráno",
  time_day:      "Dobrý deň",
  time_evening:  "Dobrý večer",
  time_night:    "Dobrú noc",
  smartbar_hint: "rýchle voľby",

  cat_breakfast: "Raňajky",
  cat_hygiene:   "Hygiena",
  cat_dressing:  "Obliekanie",
  cat_play:      "Hra",
  cat_learning:  "Učenie",
  cat_outside:   "Vonku",
  cat_food:      "Jedlo",
  cat_dinner:    "Večera",
  cat_bath:      "Kúpanie",
  cat_sleep:     "Spánok",
  cat_night:     "Noc",

  sos_hurt:      "BOLÍ",
  sos_stop:      "STOP",
  sos_quiet:     "TICHO",
  sos_help:      "POMOC",
  sos_hurt_sub:  "Bolí ma",
  sos_stop_sub:  "Chcem preč",
  sos_quiet_sub: "Potrebujem kľud",
  sos_help_sub:  "Potrebujem pomoc",

  sos_title:      "Guardian SOS",
  sos_subtitle:   "Vyber, čo potrebuješ",
  sos_exit_label: "Ukončiť SOS režim",
  sos_hold_hint:  "držať",

  search_placeholder: "Hľadaj… (jesť, pes, škola, pomoc)",
  search_empty_title: "Nič sa nenašlo",
  search_empty_sub:   "Skús iné slovo alebo kratší výraz",
  search_error_retry: "Skúsiť znova",
  search_results:     "výsledkov pre",
  search_examples:    "jesť|pes|škola|bolesť|pomoc",

  voice_speak:       "Prečítať",
  voice_stop:        "Zastaviť",
  voice_unsupported: "Hlasová syntéza nie je dostupná",

  rec_title:     "Vlastná nahrávka",
  rec_existing:  "Nahrávka existuje",
  rec_rerecord:  "Prenahrať",
  rec_delete:    "Zmazať",
  rec_prepare:   "priprav sa…",
  rec_recording: "NAHRÁVAM",
  rec_done_btn:  "Hotovo",
  rec_saved:     "Uložené!",
  rec_error:     "Chyba nahrávania",

  lock_title:      "Rodičovské overenie",
  lock_subtitle:   "Vyriešte príklad pre prístup do nastavení",
  lock_confirm:    "Potvrdiť",
  lock_cancel:     "Zrušiť",
  lock_wrong:      "Zlá odpoveď – skús nový príklad",
  lock_hold_hint:  "Alebo podržte tlačidlo zámku 3 sekundy",
  lock_enter_calc: "Zadať výpočet",

  sync_title:   "Cloud Sync",
  sync_synced:  "Synchronizované",
  sync_offline: "Offline",
  sync_syncing: "Synchronizuje…",
  sync_error:   "Chyba synchronizácie",
  sync_pull:    "↻ Aktualizovať",
  sync_push:    "⬆ Nahrať zmeny",
  sync_last:    "Posledný sync:",
  sync_items:   "položiek",
  sync_url_label: "Apps Script URL",
  sync_url_save:  "Uložiť",

  offline_msg:  "📶 Offline – načítané piktogramy sú k dispozícii z cache",
  online_back:  "✓ Pripojenie obnovené",

  error_restart:   "↻ Reštartovať aplikáciu",
  error_back:      "← Dashboard",
  error_log_title: "Chybový log",
  error_log_clear: "Zmazať",
  error_occurred:  "Niečo sa pokazilo",
  error_safe:      "Tvoje dáta sú v bezpečí – reštart pomôže.",

  action_close:   "Zavrieť",
  action_save:    "Uložiť",
  action_delete:  "Zmazať",
  action_cancel:  "Zrušiť",
  action_confirm: "Potvrdiť",
  action_refresh: "Obnoviť",
  hold_to:        "Podržať pre",
  language_label: "Jazyk",
  language_name:  "Slovenčina",
};

// ── ANGLIČTINA ─────────────────────────────────────────────────────────────
const en: TranslationSchema = {
  nav_dashboard:    "Dashboard",
  nav_communicator: "Communicator",
  nav_sos:          "SOS",
  nav_about:        "About",
  nav_search:       "Search",
  nav_settings:     "Settings",

  dash_sentence_placeholder: "Select pictograms to build a sentence…",
  dash_speak_all:            "Speak sentence",
  dash_clear_sentence:       "Clear",
  dash_search_placeholder:   "Search pictogram…",
  dash_upcoming:             "Quick picks",

  time_morning:  "Good morning",
  time_day:      "Good afternoon",
  time_evening:  "Good evening",
  time_night:    "Good night",
  smartbar_hint: "quick picks",

  cat_breakfast: "Breakfast",
  cat_hygiene:   "Hygiene",
  cat_dressing:  "Dressing",
  cat_play:      "Play",
  cat_learning:  "Learning",
  cat_outside:   "Outside",
  cat_food:      "Food",
  cat_dinner:    "Dinner",
  cat_bath:      "Bath",
  cat_sleep:     "Sleep",
  cat_night:     "Night",

  sos_hurt:      "HURTS",
  sos_stop:      "STOP",
  sos_quiet:     "QUIET",
  sos_help:      "HELP",
  sos_hurt_sub:  "I am in pain",
  sos_stop_sub:  "I want to leave",
  sos_quiet_sub: "I need quiet",
  sos_help_sub:  "I need help",

  sos_title:      "Guardian SOS",
  sos_subtitle:   "Choose what you need",
  sos_exit_label: "Exit SOS mode",
  sos_hold_hint:  "hold",

  search_placeholder: "Search… (eat, dog, school, help)",
  search_empty_title: "Nothing found",
  search_empty_sub:   "Try a different word or shorter phrase",
  search_error_retry: "Try again",
  search_results:     "results for",
  search_examples:    "eat|dog|school|pain|help",

  voice_speak:       "Speak",
  voice_stop:        "Stop",
  voice_unsupported: "Speech synthesis not available",

  rec_title:     "Custom recording",
  rec_existing:  "Recording exists",
  rec_rerecord:  "Re-record",
  rec_delete:    "Delete",
  rec_prepare:   "get ready…",
  rec_recording: "RECORDING",
  rec_done_btn:  "Done",
  rec_saved:     "Saved!",
  rec_error:     "Recording error",

  lock_title:      "Parental verification",
  lock_subtitle:   "Solve the equation to access settings",
  lock_confirm:    "Confirm",
  lock_cancel:     "Cancel",
  lock_wrong:      "Wrong answer – try a new equation",
  lock_hold_hint:  "Or hold the lock button for 3 seconds",
  lock_enter_calc: "Enter equation",

  sync_title:   "Cloud Sync",
  sync_synced:  "Synchronized",
  sync_offline: "Offline",
  sync_syncing: "Syncing…",
  sync_error:   "Sync error",
  sync_pull:    "↻ Refresh",
  sync_push:    "⬆ Upload changes",
  sync_last:    "Last sync:",
  sync_items:   "items",
  sync_url_label: "Apps Script URL",
  sync_url_save:  "Save",

  offline_msg:  "📶 Offline – cached pictograms are available",
  online_back:  "✓ Connection restored",

  error_restart:   "↻ Restart app",
  error_back:      "← Dashboard",
  error_log_title: "Error log",
  error_log_clear: "Clear",
  error_occurred:  "Something went wrong",
  error_safe:      "Your data is safe – a restart will help.",

  action_close:   "Close",
  action_save:    "Save",
  action_delete:  "Delete",
  action_cancel:  "Cancel",
  action_confirm: "Confirm",
  action_refresh: "Refresh",
  hold_to:        "Hold for",
  language_label: "Language",
  language_name:  "English",
};

// ── Export ─────────────────────────────────────────────────────────────────
export type LangCode = "cs" | "sk" | "en";

export const TRANSLATIONS: Record<LangCode, TranslationSchema> = { cs, sk, en };

export const LANG_META: Record<LangCode, {
  code:     LangCode;
  name:     string;       // vlastní název
  flag:     string;       // emoji vlajka
  arasaac:  string;       // kód pro ARASAAC API
  ttsLang:  string;       // BCP-47 kód pro Web Speech API
}> = {
  cs: { code:"cs", name:"Čeština",    flag:"🇨🇿", arasaac:"cs", ttsLang:"cs-CZ" },
  sk: { code:"sk", name:"Slovenčina", flag:"🇸🇰", arasaac:"sk", ttsLang:"sk-SK" },
  en: { code:"en", name:"English",    flag:"🇬🇧", arasaac:"en", ttsLang:"en-GB" },
};

export const DEFAULT_LANG: LangCode = "cs";
