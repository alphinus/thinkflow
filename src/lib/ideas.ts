import { Idea } from '@/types';

// ============================================================
// ELUMA Ideas Collection (40 Ideas)
// ============================================================

export const existingIdeas: Idea[] = [
  // === BATCH 1: Original 20 Ideas ===
  { id: 1, category: "Gesundheit", title: "Mental Health Predictor", description: "Analysiert Stimme und Bewegungsmuster für frühe Depressionserkennung", icon: "🧠" },
  { id: 2, category: "Gesundheit", title: "KI-Hautkrebserkennung", description: "Smartphone-Kamera zur Muttermal-Analyse mit Risikoeinschätzung", icon: "📱" },
  { id: 3, category: "Kreativität", title: "Urban Canvas AR", description: "Virtuelle Fassadengestaltung auf reale Gebäude projizieren", icon: "🎨" },
  { id: 4, category: "Kreativität", title: "DreamCraft", description: "Lucid-Dreaming mit KI-Training für bewusste Traumgestaltung", icon: "💭" },
  { id: 5, category: "Lifestyle", title: "Persönlicher KI-Koch", description: "Foto in Kühlschrank → Rezepte vorschlagen → Live-Kochüberwachung", icon: "👨‍🍳" },
  { id: 6, category: "Lifestyle", title: "AI Explorer Guide", description: "Kamera erkennt Umgebung und erzählt Geschichten zu Gebäuden", icon: "🗺️" },
  { id: 7, category: "Nachhaltigkeit", title: "CO2-Impact Scanner", description: "Produkte scannen → CO2-Fußabdruck + nachhaltige Alternativen", icon: "🌱" },
  { id: 8, category: "Nachhaltigkeit", title: "Smart Energy Manager", description: "Echtzeit-Energieverbrauch-Optimierung für Smart Home", icon: "⚡" },
  { id: 9, category: "Soziales", title: "GameMate Dating", description: "Spieler-Dating basierend auf Spielstilen mit In-App-Minispielen", icon: "🎮" },
  { id: 10, category: "Soziales", title: "Event Buddy Finder", description: "Vernetzt Menschen für dieselbe Veranstaltung", icon: "🎪" },
  { id: 11, category: "Innovation", title: "Radiant Energy Simulator", description: "Tesla-Physik: Simulation kosmischer Strahlungsenergie", icon: "⚛️" },
  { id: 12, category: "Innovation", title: "Vortex-Mathematik 3-6-9", description: "Universal-Rechner für energetische Schwingungsmuster", icon: "🔢" },
  { id: 13, category: "Sicherheit", title: "Akustischer Notfall-Klassifizierer", description: "KI erkennt Glasbruch, Rauchmelder → visuelle Warnung", icon: "🚨" },
  { id: 14, category: "Sicherheit", title: "Barometrische Tür-Überwachung", description: "Druckwellen-Erkennung beim Öffnen von Türen/Fenstern", icon: "🚪" },
  { id: 15, category: "Technik", title: "AirTouch Kamera", description: "Kamera-Auslösung durch Anpusten des Sensors", icon: "📸" },
  { id: 16, category: "Technik", title: "Lichtsensor-Gestensteuerung", description: "Handy steuern ohne Display-Berührung über Schatten", icon: "👋" },
  { id: 17, category: "Technik", title: "Edelstahl-Qualitätsprüfer", description: "Magnetometer prüft Materialqualität beim Kauf", icon: "🔬" },
  { id: 18, category: "Arbeit", title: "Landwirtschaftlicher AR-Berater", description: "LiDAR-Scan für Nährstoffempfehlungen per AR-Overlay", icon: "🌾" },
  { id: 19, category: "Reisen", title: "Kreuzfahrt-Kabinen-Sharing", description: "Reisende finden sich zum gemeinsamen Buchen", icon: "🚢" },
  { id: 20, category: "Forschung", title: "Roller Coaster Analysator", description: "Mobiles Labor für komplexe Bewegungsstudien", icon: "🎢" },

  // === BATCH 2: New 20 Ideas (January 2026) ===
  { id: 21, category: "Familie", title: "Was tun bei...? (Eltern-App)", description: "Offline-fähige App mit Experten-geprüften Anleitungen für Eltern ohne Panikmache", icon: "👶" },
  { id: 22, category: "Familie", title: "Digitale Erinnerungskiste", description: "Familien sammeln Sprachnachrichten, Fotos, Videos strukturiert nach Lebensthemen", icon: "📦" },
  { id: 23, category: "Sicherheit", title: "Digitale Notfallmappe", description: "Einfache App für Notfallkontakte, Dokumente, letzte Wünsche mit Ereignis-Zugriff", icon: "🆘" },
  { id: 24, category: "Nachhaltigkeit", title: "Kauf das nicht!", description: "Anti-Konsum-App mit Wartezeit, Alternativen und Lebenszeit-Kosten pro Produkt", icon: "🛑" },
  { id: 25, category: "Lokal", title: "Lokale Dienstleister", description: "Qualitätsgeprüfte Elektriker, Reinigung, Garten für eine Stadt/Region", icon: "🔧" },
  { id: 26, category: "Gesundheit", title: "Mentale Fitness für Männer", description: "Stressabbau, Fokus, Selbstkontrolle – direkt, ohne Esoterik", icon: "💪" },
  { id: 27, category: "Produktivität", title: "Mini-Coach Gewohnheiten", description: "1 Gewohnheit, 30 Tage, klare Regeln – fertig. Einfachheit gewinnt.", icon: "🎯" },
  { id: 28, category: "Produktivität", title: "Verträge kündigen", description: "Kündigungen schreiben, Fristen überwachen, per Klick versenden", icon: "📝" },
  { id: 29, category: "Lifestyle", title: "Was zieh ich an?", description: "Outfit-Entscheidung basierend auf Wetter, Anlass, Kalender, Vorlieben", icon: "👔" },
  { id: 30, category: "Selbstreflexion", title: "Entscheidungs-Archiv", description: "Dokumentiere WARUM du Entscheidungen getroffen hast, erkenne Muster", icon: "📚" },
  { id: 31, category: "Arbeit", title: "Jobby", description: "Verbindet Arbeit und Hobbys – Menschen finden sich über Interessen, Jobs entstehen", icon: "🤝" },
  { id: 32, category: "Selbstreflexion", title: "Life Update", description: "Regelmäßige persönliche Updates statt Lebensläufe – Fokus auf echte Veränderungen", icon: "📊" },
  { id: 33, category: "Selbstreflexion", title: "Lebens-Simulation", description: "Was wäre wenn? Simuliere Lebensentscheidungen zur Reflexion, nicht Prognose", icon: "🔮" },
  { id: 34, category: "Selbstreflexion", title: "Unverhandelbar-Liste", description: "Definiere 3-7 Dinge, die du nie wieder akzeptierst – in Job, Beziehung, Leben", icon: "🚫" },
  { id: 35, category: "Selbstreflexion", title: "Lebensvertrag", description: "Privater Vertrag mit dir selbst: Werte, Grenzen, Krisenverhalten", icon: "📜" },
  { id: 36, category: "Selbstreflexion", title: "Werte-Navigator", description: "Echte Werte aus Verhalten ableiten, nicht aus Selbstauskunft", icon: "🧭" },
  { id: 37, category: "Produktivität", title: "STILL", description: "Schütze Ruhe und Fokuszeiten – sichtbarer Status ohne Chat-Unterbrechung", icon: "🤫" },
  { id: 38, category: "Selbstreflexion", title: "Schuld & Abschluss", description: "Emotional Dinge abschließen, unausgesprochene Worte festhalten – privat und sicher", icon: "🕊️" },
  { id: 39, category: "Kommunikation", title: "ClearSpeak", description: "Echtzeit-Sprachcoaching: Füllwörter, Tempo, Klarheit – während du sprichst", icon: "🎙️" },
  { id: 40, category: "Kommunikation", title: "ClearSpeak Pro", description: "Meeting-Modus, Vorbereitung, Langzeit-Sprachmuster – für Führungskräfte & Sales", icon: "🎤" }
];
