# Importer votre catalogue de codes

Les codes d'imputation de Walker proviennent du catalogue de votre propre système de feuille de
temps. Vous importez cette liste une fois — et la réimportez chaque fois qu'elle change — et Walker
la conserve comme **catalogue de référence** consultable. À partir de là, vous choisissez la poignée
de codes sur lesquels vous imputez réellement pour les ajouter à vos **codes actifs**.

## Deux niveaux : catalogue de référence et codes actifs

- **Catalogue de référence** — la liste complète que vous importez. Ce peut être tout le catalogue de
  votre organisation (des milliers de codes) ; Walker ne fait que le consulter, il ne l'affiche
  jamais en bloc.
- **Codes actifs** — les codes sur lesquels vous suivez réellement votre temps. Dans l'écran **Code
  catalog**, vous cherchez le catalogue de référence par numéro, projet ou libellé et cliquez sur un
  résultat pour l'ajouter — avec toutes ses activités — à vos codes actifs. Le minuteur, la vue de
  période de feuille de temps et la liste de pointage travaillent tous à partir de vos codes actifs.

## Le format CSV

Importez un fichier CSV avec une ligne par **code × activité** (un code ayant plusieurs activités
occupe plusieurs lignes). Deux dispositions sont acceptées :

- **Avec ligne d'en-tête** — la première ligne est exactement :

  ```csv
  code_number,code_label,code_name,activity_code,activity_label
  ```

- **Export sans en-tête** — quatre colonnes, sans ligne d'en-tête :

  ```csv
  code_number,code_label,activity_code,activity_label
  ```

  Ici `code_name` prend par défaut la valeur de `code_label`.

| Colonne | Signification |
| --- | --- |
| `code_number` | Le code d'imputation tel que votre système de feuille de temps le connaît (par ex. `N9/1042`) |
| `code_label` | Le libellé technique du code |
| `code_name` | Un nom d'affichage plus lisible (optionnel ; par défaut le libellé) |
| `activity_code` | Le code de l'activité sous ce code d'imputation |
| `activity_label` | Le libellé de l'activité |

Les champs entre guillemets peuvent contenir des virgules, et une marque d'ordre des octets (BOM)
UTF-8 est tolérée — un export brut depuis un tableur ou un outil de base de données s'importe donc
généralement tel quel.

## Importer

Dans l'écran **Code catalog**, choisissez **Import from file** et sélectionnez votre CSV. L'import
fait un **upsert par `code_number`**, si bien que réimporter un export mis à jour est idempotent :
les codes existants sont mis à jour sur place, les nouveaux sont ajoutés, et une couleur est
attribuée automatiquement à chacun. Les gros catalogues (des milliers de codes) s'importent en
quelques secondes et restent réactifs, car le catalogue et le sélecteur de code n'affichent qu'une
tranche plafonnée et s'appuient sur la recherche.

## Produire le CSV

La manière de produire le fichier dépend de votre système de feuille de temps ou ERP — généralement
un export, ou une requête sur ses tables de catalogue, qui produit les colonnes ci-dessus dans
l'ordre. Tout outil capable de sortir du CSV convient ; avec la disposition à quatre colonnes, aucune
ligne d'en-tête n'est nécessaire. Restreignez l'export aux seuls codes sur lesquels vous pourriez
imputer si le catalogue complet est très volumineux.
