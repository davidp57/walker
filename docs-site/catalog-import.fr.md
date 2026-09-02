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

!!! warning "Seule la disposition à quatre colonnes peut se passer d'en-tête"

    Si votre export compte cinq colonnes, la ligne d'en-tête est obligatoire. Walker refuse un
    fichier aussi large dépourvu d'en-tête plutôt que de le mal lire : sans en-tête, chaque champ se
    décale d'un cran, `code_name` est pris pour `activity_code`, et le catalogue se remplit
    silencieusement de valeurs absurdes. La plupart des clients SQL omettent les noms de colonnes
    sauf demande explicite — dans SSMS, c'est *Include column headers* dans les options de résultats.

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

### Se débarrasser des codes qui n'existent plus

Un import ajoute et met à jour, mais par défaut il ne supprime rien — un code de facturation
**clôturé depuis dans votre système de feuilles de temps** reste donc dans le catalogue de référence
de Walker et continue d'être proposé, bien après que vous ne pouvez plus y imputer.

Pour faire le ménage, cochez **« This file is my complete catalog »** dans la boîte de dialogue
d'import. Les codes absents du fichier sont alors retirés du catalogue de référence. Seul le
catalogue de référence est purgé : les codes que vous avez déjà ajoutés à votre liste restent, ainsi
que tout le temps qui y est imputé.

Laissez la case décochée dès que le fichier ne couvre qu'une partie de votre catalogue — combinée à
la purge, une extraction partielle effacerait tout ce qu'elle ne mentionne pas.

### Les codes que vous imputez et que le catalogue ne liste plus

La purge ne touche jamais aux codes de votre propre liste : c'est pourquoi un code d'imputation
**clôturé dans votre système de feuilles de temps** restait indéfiniment dans Walker, proposé dans
tous les sélecteurs, sans que rien ne signale qu'il était mort.

Après un import « catalogue complet », Walker vous dit désormais lesquels de vos codes le fichier ne
contenait pas, et propose les deux gestes qui ont du sens :

- **Le retirer** — le bon choix quand la ligne d'imputation est réellement fermée. Le temps déjà
  imputé reste intact ; le code cesse simplement d'être proposé.
- **Le repointer** — quand d'autres de vos codes imputent *à travers* lui. Choisissez le remplaçant
  et ils suivent tous en une seule fois.

C'est surtout vrai pour un code que vous ne voyez pas. Quand vous créez un code qui impute sur un
code existant, Walker garde ce code sous-jacent masqué — le vôtre peut donc paraître en parfaite
santé dans le catalogue alors que ce sur quoi il impute est verrouillé depuis des mois. C'est pour
cette raison que Walker nomme explicitement les codes dépendants.

**Rien n'est modifié à votre place.** Un code peut manquer simplement parce que votre export ne
couvrait qu'une partie du catalogue, et retirer un code que vous imputez encore serait la pire des
erreurs. La mention reste ensuite sur le code dans le **Code catalog**, pour qu'une décision remise à
plus tard ne disparaisse pas en silence.

## Produire le CSV

La manière de produire le fichier dépend de votre système de feuille de temps ou ERP — généralement
un export, ou une requête sur ses tables de catalogue, qui produit les colonnes ci-dessus dans
l'ordre. Tout outil capable de sortir du CSV convient ; avec la disposition à quatre colonnes, aucune
ligne d'en-tête n'est nécessaire. Restreignez l'export aux seuls codes sur lesquels vous pourriez
imputer si le catalogue complet est très volumineux.
