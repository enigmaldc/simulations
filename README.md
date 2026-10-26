# Simulationen zu Mathematik und Physik

Eine wachsende Sammlung interaktiver Simulationen für den Unterricht.
Übersicht und Experimente sind in Schweizer Hochdeutsch (`de-CH`) verfasst.

## Mit Lernenden teilen

Übersicht: https://enigmaldc.github.io/simulations/

- Jo-Jo-Labor: https://enigmaldc.github.io/simulations/physics/yoyo/
- Spulenparadoxon: https://enigmaldc.github.io/simulations/physics/spool/
- KSHBot · PID- und LQR-Labor: https://enigmaldc.github.io/simulations/physics/kshbot/

Benötigt werden Internet und ein aktueller Browser mit WebGL 2. Konten und
Installationen sind nicht nötig. Die Physik wird im Browser berechnet; es gibt
keine kostenpflichtigen KI-Aufrufe und keine API-Schlüssel.

## Aufbau des Repositorys

```text
index.html                 # Übersicht mit Suche und Fachfiltern
simulations.json           # Liste aller Simulationen
.nojekyll                  # Dateien ohne Jekyll-Verarbeitung ausliefern
physics/
  yoyo/index.html          # Jo-Jo-Labor
  spool/index.html         # Spulenparadoxon
  kshbot/index.html        # LQR-Regelung eines Balanceroboters
mathematics/               # Für spätere Mathematik-Experimente anlegen
```

Jeder Versuch liegt in einem eigenen Ordner und hat eine dauerhafte Adresse.
Die relativen Links funktionieren unter dem GitHub-Pages-Projektpfad
`/simulations/`. Die Übersicht liest `simulations.json`; ein Build-Schritt ist
nicht nötig. Three.js und OrbitControls verwenden beide Version 0.180.0.

## GitHub Pages einmalig einrichten

1. Öffne https://github.com/enigmaldc/simulations/settings/pages
2. Wähle **Deploy from a branch**.
3. Wähle **main** und **/(root)** und klicke auf **Save**.
4. Warte, bis der Pages-Lauf im Tab **Actions** erfolgreich abgeschlossen ist.
5. Öffne **Visit site** in den Pages-Einstellungen, um die Übersicht zu prüfen.

Weitere Commits auf `main` werden automatisch veröffentlicht. GitHub Pages
steht für öffentliche Repositorys mit GitHub Free zur Verfügung. Für diese
Einrichtung muss das Repository öffentlich bleiben.

## Weitere Simulation hinzufügen

1. Erstelle einen aussagekräftigen Ordner, zum Beispiel `physics/pendulum/`
   oder `mathematics/trigonometry/`.
2. Lege darin die Startdatei `index.html` ab. Weitere Dateien gehören in
   denselben Ordner; verwende relative URLs für diese Dateien.
3. Ergänze die JSON-Liste in `simulations.json` um einen Eintrag:

```json
{
  "id": "pendulum",
  "title": "Pendellabor",
  "subject": "Physik",
  "topic": "Schwingungen",
  "description": "Untersuche, wie Länge und Fallbeschleunigung die Schwingungsdauer beeinflussen.",
  "path": "physics/pendulum/",
  "icon": "generic",
  "tags": ["Schwingungsdauer", "Schwerkraft", "Schwingungen"]
}
```

4. Verwende eine eindeutige `id`. Der `path` bleibt relativ, ohne `/` am
   Anfang und ohne `..`-Segmente. Trenne Einträge durch Kommas; nach dem
   letzten Eintrag steht kein Komma.
5. Ergänze im Experiment einen sichtbaren Link zurück zur Übersicht. Bei
   zwei Unterordnern lautet er `<a href="../../">Alle Simulationen</a>`.
6. Committe den neuen Ordner und den JSON-Eintrag gemeinsam. Die Übersicht
   wird aus der Liste automatisch aufgebaut. Neue Fächer erhalten automatisch
   einen Filter; für Mathematik verwende `"subject": "Mathematik"`.
7. Prüfe die veröffentlichte Seite und alle Bedienelemente, bevor du sie teilst.

Als Kartenillustrationen stehen `yoyo`, `spool` und `generic` zur Verfügung.
Unbekannte Namen verwenden ebenfalls die allgemeine Illustration. Die HTML-Datei
der Übersicht muss für neue Listeneinträge nicht angepasst werden.

## Lokale Vorschau unter Windows

Öffne PowerShell im Repositoryordner und führe folgenden Befehl aus:

```powershell
py -m http.server 8000 --bind 127.0.0.1
```

Öffne anschliessend http://localhost:8000/. Lokale Datei-URLs können die
JSON-Liste nicht zuverlässig laden; verwende einen lokalen Webserver oder
die veröffentlichte Website.

Das frühere Repository `YoYoSim` ist unabhängig. Die dort bereits geteilten
Links funktionieren weiter. Für die neue Übersicht werden die Kopien in
diesem Repository gepflegt; die frühere Sammlung bleibt unverändert.

## Quellen

- [GitHub Pages einrichten (Englisch)](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [UMass Amherst: «Walking the Spool» (Englisch)](https://people.umass.edu/plecprep/mech/1k1030.html)

## KSHBot-Labor

Das KSHBot-Labor enthält das bereitgestellte Gehäusemodell, schematische Zusatzbauteile und eine nichtlineare Längsdynamik. Die vier Rückführverstärkungen entsprechen den Parametern KTH, KOM, KX und KV. Massenverteilung und Trägheit sind veränderbare Schätzungen; die Simulation ist nicht am echten Roboter validiert. Three.js und das STL sind vollständig in der HTML-Datei enthalten.

Im KSHBot-Labor ist die Regelung zwischen LQR und Winkel-PID umschaltbar. PID bietet Kp/Ki/Kd und Sollwinkel sowie die Firmwarevarianten LSM6DSO (gefiltertes Gyro-D) und MPU6050 (PID_v1). Beim Wechsel werden Zustand, I-Speicher und Aufzeichnung zurückgesetzt. Die CSV-Datei enthält beide Parametersätze, Regler, PID-Variante und Modellwerte.
