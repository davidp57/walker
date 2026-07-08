# Guide au quotidien

Cette page décrit comment Walker est censé être utilisé, au jour le jour : démarrer un minuteur,
répartir votre temps suivi entre les codes d'imputation, et préparer la vue de fin de période que
vous resaisissez dans votre système de feuille de temps.

## Le minuteur

La barre du minuteur se trouve en haut de l'application, toujours visible. Le démarrer prend un clic —
il n'y a rien à renseigner d'abord. Tapez une brève description de ce que vous faites si vous le
souhaitez, mais ce n'est pas obligatoire : vous pouvez la laisser vide et y revenir plus tard.

Pendant que le minuteur tourne, vous pouvez :

- **Changer de tâche** sans perdre de temps : cliquez sur la pastille de tâche pour choisir un autre
  code d'imputation (et, si le code en a, une Activité — une sous-catégorie plus fine sous ce code).
  Le changement clôt l'entrée en cours et en ouvre immédiatement une nouvelle, de sorte qu'aucun temps
  n'est perdu ni compté deux fois entre les deux.
- **Modifier l'heure de début** si vous avez oublié de démarrer le minuteur exactement au moment où
  vous avez commencé à travailler — cliquez sur le libellé « since HH:MM » à côté de l'horloge et
  corrigez-le.
- **Stop** pour terminer l'entrée, ou **Complete** (affiché lorsque l'entrée en cours est liée à une
  tâche listée) pour arrêter le minuteur et marquer cette tâche comme faite dans le même clic.

Chaque durée est enregistrée à la minute — Walker n'arrondit jamais. L'arrondi à l'incrément attendu
par votre système de feuille de temps (généralement le quart d'heure) est quelque chose que vous
faites au moment de recopier les chiffres là-bas, pas quelque chose que Walker décide pour vous.

## Les entrées et la catégorisation

Tout ce que vous suivez — qu'il soit démarré depuis le minuteur ou ajouté à la main — s'appelle une
**entrée** : un bloc de temps avec une description, éventuellement lié à un code d'imputation et une
Activité. La vue Activity liste vos entrées, la plus récente en premier, pour que vous puissiez les
relire et les modifier : changer les horaires, corriger la description, ou rattacher un code
d'imputation que vous n'aviez pas choisi pendant que l'horloge tournait.

Une entrée encore sans code d'imputation est « non catégorisée » — un petit badge sur la navigation
vous indique combien sont encore en attente. Il n'y a pas d'échéance pour catégoriser une entrée
immédiatement ; Walker est conçu autour de l'idée de capturer le temps d'abord et de le trier quand
cela arrange, même le lendemain.

## Les codes d'imputation et le catalogue

Les codes d'imputation de Walker reflètent les codes que votre système de feuille de temps utilise
pour ventiler le travail, chacun avec un numéro, un libellé et une couleur pour un repérage visuel
rapide dans la grille. Vous (ou votre organisation) importez cette liste une fois depuis le catalogue
de votre système de feuille de temps, et elle devient consultable au moment de choisir un code pour
une entrée.

Par-dessus ces codes réels, vous pouvez créer des **codes virtuels** : vos propres catégories, plus
spécifiques, qui pointent vers un code réel (par exemple, scinder un code large « Travail projet » en
quelques codes virtuels qui ont un sens pour vous personnellement). Suivez et organisez votre temps
sur des codes virtuels pour une répartition aussi fine que vous le souhaitez — au moment de préparer
votre feuille de temps, chaque code virtuel se replie sur l'unique code réel vers lequel il pointe, de
sorte que le système que vous resaisissez ne voit jamais que les codes qu'il connaît réellement.

## La vue de période de feuille de temps

À la fin de chaque période (hebdomadaire, deux fois par mois, ou mensuelle — selon ce qui correspond à
votre système de feuille de temps, choisi une fois dans les Réglages), passez à la vue de période.
Elle remet en forme vos entrées suivies en une grille qui ressemble à l'écran de saisie de votre
système de feuille de temps : une ligne par code d'imputation, une colonne par jour, des cellules
totalisant le temps que vous avez suivi.

La vue a deux modes :

- **Review** — un simple miroir de votre temps suivi par code, pour que vous puissiez vérifier les
  totaux avant de taper quoi que ce soit où que ce soit. Cliquez sur une cellule pour voir (et
  modifier) les entrées individuelles derrière ce total. Les week-ends sont grisés, et les jours que
  vous avez marqués comme absence (congé, jour férié, etc.) sont affichés pré-remplis, correspondant à
  ce que votre système de feuille de temps sait déjà de ces jours-là.
- **Enter in [système de feuille de temps]** — la même grille, mais organisée exactement comme
  l'attend l'écran de saisie de votre système de feuille de temps (codes virtuels résolus vers leur
  code réel), avec une liste de pointage : cochez chaque cellule à mesure que vous la saisissez dans
  l'autre système. Une barre de progression suit la part de la période que vous avez resaisie, et
  Maj-clic permet de cocher toute une plage d'un coup.

Utilisez les flèches (ou « Today ») au-dessus de la grille pour passer d'une période à l'autre.

## Les tâches

L'écran Tasks est une liste de choses à faire légère, distincte des entrées de temps mais connectée à
elles. Une tâche a un titre, une description optionnelle, un statut (To-do, In progress, Waiting,
Test, Done), et éventuellement un code d'imputation. Consultez-la sous forme de simple liste ou de
tableau kanban où vous faites glisser les cartes.

Démarrer le minuteur depuis une tâche listée pré-remplit la description de l'entrée avec le titre de
la tâche et son code d'imputation, ce qui vous évite de retaper l'un ou l'autre — vous choisissez
toujours l'Activité vous-même. C'est utile pour le travail récurrent ou planifié que vous voulez
suivre de façon cohérente ; pour les choses ponctuelles, taper une description directement dans le
minuteur sans passer par la liste des tâches fonctionne exactement de la même manière.
