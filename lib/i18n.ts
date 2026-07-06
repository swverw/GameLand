'use client'

import { useGameStore } from '@/lib/gameStore'

export type Lang = 'ru' | 'en'

export const LANGS: { id: Lang; label: string; flag: string }[] = [
  { id: 'ru', label: 'РУС', flag: '🇷🇺' },
  { id: 'en', label: 'ENG', flag: '🇬🇧' },
]

type Dict = Record<string, { ru: string; en: string }>

export const T: Dict = {
  // splash
  'splash.title': { ru: 'Игролендия', en: 'GameLand' },
  'splash.sub': { ru: '16 игр · 16 медалей · бесконечное веселье!', en: '16 games · 16 medals · endless fun!' },
  'splash.start': { ru: '▶ СТАРТ', en: '▶ START' },
  'splash.back': { ru: 'На заставку', en: 'To splash' },

  // menu
  'menu.title': { ru: 'Выбери игру 🎈', en: 'Choose a game 🎈' },
  'menu.subtitle': { ru: 'Собери все 16 медалей и стань чемпионом!', en: 'Collect all 16 medals and become a champion!' },
  'menu.medal': { ru: 'Медаль получена', en: 'Medal earned' },

  // games
  'game.memory': { ru: 'Найди пару', en: 'Find the Pair' },
  'game.drawing': { ru: 'Разукрашка', en: 'Coloring' },
  'game.platformer': { ru: 'Бегун', en: 'Runner' },
  'game.puzzle': { ru: 'Пазлы', en: 'Puzzles' },
  'game.snake': { ru: 'Змейка', en: 'Snake' },
  'game.music': { ru: 'Музыкальная память', en: 'Music Memory' },
  'game.whack': { ru: 'Прихлопни крота', en: 'Whack-a-Mole' },
  'game.dots': { ru: 'Соедини точки', en: 'Connect the Dots' },

  // common
  'common.menu': { ru: 'Меню', en: 'Menu' },
  'common.toLevels': { ru: 'К уровням', en: 'To levels' },
  'common.toPuzzles': { ru: 'К пазлам', en: 'To puzzles' },
  'common.retry': { ru: 'Ещё раз', en: 'Try again' },
  'common.next': { ru: 'Следующий уровень ▶', en: 'Next level ▶' },
  'common.nextPuzzle': { ru: 'Следующий пазл ▶', en: 'Next puzzle ▶' },
  'common.nextPicture': { ru: 'Следующая картинка', en: 'Next picture' },
  'common.done': { ru: 'Готово!', en: 'Done!' },
  'common.play': { ru: '▶ Играть', en: '▶ Play' },
  'common.completed': { ru: '✅ Пройдено', en: '✅ Done' },
  'common.locked': { ru: '🔒 Закрыто', en: '🔒 Locked' },
  'common.medalEarned': { ru: 'Медаль получена!', en: 'Medal earned!' },
  'common.levelDone': { ru: 'Уровень пройден!', en: 'Level complete!' },
  'common.allDone': { ru: 'Готово!', en: 'Finished!' },
  'common.score': { ru: 'Очки', en: 'Score' },
  'common.fullReset': { ru: 'Сбросить прогресс', en: 'Reset progress' },
  'common.confirmReset': { ru: 'Сбросить весь прогресс этой игры?', en: 'Reset all progress for this game?' },

  // victory
  'victory.title': { ru: 'ПОБЕДА!', en: 'VICTORY!' },
  'victory.text': { ru: 'Ты прошёл все 16 игр и собрал все 16 медалей! Ты настоящий чемпион! 🌟', en: 'You finished all 16 games and collected all 16 medals! You are a true champion! 🌟' },
  'victory.again': { ru: '🔄 Пройти заново', en: '🔄 Play again' },
  'victory.home': { ru: '🏠 В меню', en: '🏠 To menu' },
  'victory.medal': { ru: 'Медаль', en: 'Medal' },

  // skyscraper
  'game.skyscraper': { ru: 'Небоскрёб', en: 'Skyscraper' },
  'sky.title': { ru: '🏙️ Небоскрёб', en: '🏙️ Skyscraper' },
  'sky.desc': { ru: 'Сбрасывай блоки ровно друг на друга — построй башню из 7 этажей!', en: 'Drop blocks perfectly on each other — build a 7-floor tower!' },
  'sky.tip': { ru: '💡 Тапни, когда блок над башней!', en: '💡 Tap when the block is over the tower!' },
  'sky.floors': { ru: 'этажей', en: 'floors' },
  'sky.fell': { ru: 'Башня упала!', en: 'Tower fell!' },
  'sky.done': { ru: 'Башня построена!', en: 'Tower complete!' },
  'sky.medalSub': { ru: 'Все 3 уровня пройдены!', en: 'All 3 levels complete!' },
  'sky.easy': { ru: 'Лёгкий', en: 'Easy' },
  'sky.medium': { ru: 'Средний', en: 'Medium' },
  'sky.hard': { ru: 'Сложный', en: 'Hard' },

  // safecracker
  'game.safecracker': { ru: 'Взлом Сейфа', en: 'Safe Cracker' },
  'game.pingpong': { ru: 'Пинг-Понг', en: 'Ping Pong' },
  'game.candyrace': { ru: 'Сбор Конфет', en: 'Candy Race' },
  'game.duel': { ru: 'Ковбойская Дуэль', en: 'Cowboy Duel' },
  'game.tapbattle': { ru: 'Тап-Битва', en: 'Tap Battle' },

  // game descriptions
  'desc.memory': { ru: 'Найди пары карточек!', en: 'Find matching pairs!' },
  'desc.drawing': { ru: 'Раскрась 20 картинок!', en: 'Color 20 pictures!' },
  'desc.platformer': { ru: 'Беги, прыгай, собирай!', en: 'Run, jump, collect!' },
  'desc.puzzle': { ru: 'Собери пазлы 3×3 до 5×5!', en: 'Solve 3×3 to 5×5 puzzles!' },
  'desc.snake': { ru: 'Змейка на конвейере!', en: 'Snake on a conveyor!' },
  'desc.music': { ru: 'Повтори мелодию + композитор!', en: 'Repeat melody + composer!' },
  'desc.whack': { ru: 'Прихлопни кротов! 1-2 игрока', en: 'Whack moles! 1-2 players' },
  'desc.oddoneout': { ru: 'Найди лишнюю картинку!', en: 'Find the odd one!' },
  'desc.spotdiff': { ru: 'Найди все отличия!', en: 'Spot all differences!' },
  'desc.rhythm': { ru: 'Лови ноты в ритме!', en: 'Catch notes in rhythm!' },
  'desc.skyscraper': { ru: 'Построй башню из 7 блоков!', en: 'Build a 7-block tower!' },
  'desc.safecracker': { ru: 'Взломай сейф — 5 попаданий!', en: 'Crack the safe — 5 hits!' },
  'desc.pingpong': { ru: 'Пинг-понг: 2 игрока + робот!', en: 'Ping-pong: 2P + CPU!' },
  'desc.candyrace': { ru: 'Кто соберёт больше конфет?', en: 'Who collects more candy?' },
  'desc.duel': { ru: 'Ковбойская дуэль на реакцию!', en: 'Cowboy reaction duel!' },
  'desc.tapbattle': { ru: 'Перетяни канат — тапай!', en: 'Tug of war — tap fast!' },
  'safe.title': { ru: '🔓 Взлом Сейфа', en: '🔓 Safe Cracker' },
  'safe.desc': { ru: 'Кликни, когда стрелка на зелёной точке! 5 точных попаданий подряд.', en: 'Click when the arrow hits the green dot! 5 hits in a row.' },
  'safe.tip': { ru: '💡 Жми, когда стрелка на зелёной точке!', en: '💡 Tap when the arrow is on the green dot!' },
  'safe.hits': { ru: 'попаданий', en: 'hits' },
  'safe.missed': { ru: 'Мимо! Стрелка не на точке', en: 'Missed! Arrow not on dot' },
  'safe.done': { ru: 'Сейф взломан!', en: 'Safe cracked!' },
  'safe.medalSub': { ru: 'Все 3 уровня пройдены!', en: 'All 3 levels complete!' },
  'safe.easy': { ru: 'Лёгкий', en: 'Easy' },
  'safe.medium': { ru: 'Средний', en: 'Medium' },
  'safe.hard': { ru: 'Сложный', en: 'Hard' },

  // shop
  'shop.title': { ru: '🛒 Магазин Скинов', en: '🛒 Skin Shop' },
  'shop.coins': { ru: 'монет', en: 'coins' },
  'shop.buy': { ru: 'Купить', en: 'Buy' },
  'shop.equip': { ru: 'Надеть', en: 'Equip' },
  'shop.equipped': { ru: '✅ Надето', en: '✅ Equipped' },
  'shop.owned': { ru: 'Куплено', en: 'Owned' },
  'shop.notEnough': { ru: 'Недостаточно монет!', en: 'Not enough coins!' },
  'shop.earnMore': { ru: 'Получай монеты за медали!', en: 'Earn coins from medals!' },

  // memory
  'memory.desc': { ru: '28 карточек, 14 пар. Сначала ход синих, потом красных.', en: '28 cards, 14 pairs. Blue moves first, then red.' },
  'memory.medalHint': { ru: '🏆 Обыграй компьютер 3 раза — получи медаль!', en: '🏆 Beat the computer 3 times to earn a medal!' },
  'memory.medalHintNow': { ru: 'Сейчас', en: 'Now' },
  'memory.medalDone': { ru: '🏆 Медаль уже получена', en: '🏆 Medal already earned' },
  'memory.mode2p': { ru: '2 игрока', en: '2 players' },
  'memory.mode2pSub': { ru: 'Синие против красных', en: 'Blue vs Red' },
  'memory.modeCpu': { ru: 'Против компьютера', en: 'vs Computer' },
  'memory.modeCpuSub': { ru: 'Ты — синие 🟦', en: 'You are Blue 🟦' },
  'memory.blue': { ru: 'Синие', en: 'Blue' },
  'memory.red': { ru: 'Красные', en: 'Red' },
  'memory.cpu': { ru: 'Компьютер', en: 'Computer' },
  'memory.turnBlue': { ru: 'Ход: Синих 🟦', en: 'Turn: Blue 🟦' },
  'memory.turnRed': { ru: 'Ход: Красных 🟥', en: 'Turn: Red 🟥' },
  'memory.cpuThinking': { ru: '🤖 Компьютер ходит...', en: '🤖 Computer is playing...' },
  'memory.gameOver': { ru: 'Игра окончена!', en: 'Game over!' },
  'memory.winBlue': { ru: 'Победили Синие! 🟦', en: 'Blue wins! 🟦' },
  'memory.winRed': { ru: 'Победили Красные! 🟥', en: 'Red wins! 🟥' },
  'memory.winCpu': { ru: 'Победил Компьютер 🟥', en: 'Computer wins 🟥' },
  'memory.tie': { ru: 'Ничья!', en: "It's a tie!" },
  'memory.playAgain': { ru: 'Играть снова', en: 'Play again' },
  'memory.winsVsCpu': { ru: 'Побед над компьютером', en: 'Wins vs computer' },

  // drawing
  'drawing.title': { ru: '🎨 Разукрашка', en: '🎨 Coloring' },
  'drawing.progress': { ru: 'Готово', en: 'Done' },
  'drawing.modeColor': { ru: 'Раскрась картинку', en: 'Color a picture' },
  'drawing.modeFree': { ru: 'Свободное рисование', en: 'Free drawing' },
  'drawing.sample': { ru: 'Образец — раскрась так же!', en: 'Sample — color it the same!' },
  'drawing.tipColor': { ru: '💡 Закрашивай серый силуэт цветами. Когда почти всё раскрашено — картинка готова!', en: '💡 Color the grey silhouette. When almost full — the picture is done!' },
  'drawing.brush': { ru: 'Кисть', en: 'Brush' },
  'drawing.pencil': { ru: 'Карандаш', en: 'Pencil' },
  'drawing.eraser': { ru: 'Ластик', en: 'Eraser' },
  'drawing.clear': { ru: 'Очистить', en: 'Clear' },
  'drawing.size': { ru: 'Размер', en: 'Size' },
  'drawing.hundred': { ru: '100%!', en: '100%!' },

  // runner
  'runner.title': { ru: 'Бегун', en: 'Runner' },
  'runner.desc': { ru: 'Выбери героя и беги через 3 локации! Прыгай, приседай и собирай монетки.', en: 'Pick a hero and run through 3 locations! Jump, duck and collect coins.' },
  'runner.pickHero': { ru: 'Выбери своего героя:', en: 'Pick your hero:' },
  'runner.jump': { ru: 'Прыжок', en: 'Jump' },
  'runner.duck': { ru: 'Присесть', en: 'Duck' },
  'runner.tip': { ru: '💡 Тап по полю или ⬆️ — прыжок. Кнопка ⬇️ — присесть.', en: '💡 Tap field or ⬆️ to jump. ⬇️ button to duck.' },
  'runner.dead': { ru: 'Не получилось!', en: 'Try again!' },
  'runner.deadSub': { ru: 'Попробуй ещё раз — у тебя получится!', en: 'Try again — you can do it!' },
  'runner.levelDone': { ru: 'Локация пройдена!', en: 'Level complete!' },
  'runner.medalSub': { ru: 'Все 3 локации пройдены!', en: 'All 3 levels complete!' },
  'runner.nextLevel': { ru: 'Следующая локация ▶', en: 'Next level ▶' },
  'runner.toLevels': { ru: 'К локациям', en: 'To levels' },
  'runner.jumpHint': { ru: '⬆️ Пробел / ↑ / тап — прыжок', en: '⬆️ Space / ↑ / tap — jump' },
  'runner.duckHint': { ru: '⬇️ ↓ / кнопка — присесть', en: '⬇️ ↓ / button — duck' },

  // puzzle
  'puzzle.title': { ru: 'Пазлы', en: 'Puzzles' },
  'puzzle.desc': { ru: 'Собери 10 красивых картинок из 9 деталек!', en: 'Assemble 10 beautiful pictures from 9 pieces!' },
  'puzzle.dragTip': { ru: 'Перетаскивай деталки на свои места. Собери все 9!', en: 'Drag pieces to their places. Collect all 9!' },
  'puzzle.piecesLeft': { ru: 'Детальки: осталось', en: 'Pieces: left' },
  'puzzle.allPlaced': { ru: 'Все деталки на местах! 🎉', en: 'All pieces placed! 🎉' },
  'puzzle.hint': { ru: 'Подсказка', en: 'Hint' },
  'puzzle.sample': { ru: 'образец', en: 'sample' },
  'puzzle.close': { ru: 'Закрыть', en: 'Close' },
  'puzzle.again': { ru: 'Заново', en: 'Again' },
  'puzzle.toPuzzles': { ru: 'К пазлам', en: 'To puzzles' },
  'puzzle.assembled': { ru: 'Пазл собран!', en: 'Puzzle assembled!' },
  'puzzle.medalSub': { ru: 'Все 10 пазлов собраны!', en: 'All 10 puzzles assembled!' },

  // snake
  'snake.title': { ru: 'Змейка на конвейере', en: 'Conveyor Snake' },
  'snake.desc': { ru: 'Уворачивайся от блоков и не упади в пропасть! Собирай монетки.', en: 'Dodge blocks and don\'t fall off! Collect coins.' },
  'snake.easy': { ru: 'Лёгкий', en: 'Easy' },
  'snake.medium': { ru: 'Средний', en: 'Medium' },
  'snake.hard': { ru: 'Сложный', en: 'Hard' },
  'snake.endless': { ru: 'Бесконечный', en: 'Endless' },
  'snake.easyDesc': { ru: 'Широкий конвейер, мало препятствий. Продержись минуту!', en: 'Wide conveyor, few obstacles. Survive a minute!' },
  'snake.medDesc': { ru: 'Конвейер уже, блоков больше. Собирай монетки!', en: 'Narrower conveyor, more blocks. Grab coins!' },
  'snake.hardDesc': { ru: 'Узкий конвейер, много блоков. Последние 10 сек — очень сложно!', en: 'Narrow conveyor, lots of blocks. Last 10 sec — very hard!' },
  'snake.steer': { ru: '⬅️ ➡️ / ← → — рули', en: '⬅️ ➡️ / ← → — steer' },
  'snake.tip': { ru: '💡 Тапни слева/справа от змейки, чтобы рулить. Не упади с конвейера!', en: '💡 Tap left/right of the snake to steer. Don\'t fall off!' },
  'snake.fell': { ru: 'Упал с конвейера!', en: 'Fell off the conveyor!' },
  'snake.survived': { ru: 'Продержался!', en: 'You survived!' },
  'snake.medalSub': { ru: 'Все 3 уровня пройдены!', en: 'All 3 levels complete!' },
  'snake.levelDone': { ru: 'уровень пройден!', en: 'level complete!' },

  // music
  'music.title': { ru: '🎵 Музыкальная память', en: '🎵 Music Memory' },
  'music.desc': { ru: 'Слушай мелодию и повторяй ноты! 3 уровня — медаль.', en: 'Listen to the melody and repeat! 3 levels — medal.' },
  'music.watch': { ru: 'Слушай... 👂', en: 'Listen... 👂' },
  'music.yourTurn': { ru: 'Твой ход! Повтори мелодию', en: 'Your turn! Repeat the melody' },
  'music.round': { ru: 'Раунд', en: 'Round' },
  'music.wrong': { ru: 'Ой! Неверная нота', en: 'Oops! Wrong note' },
  'music.levelDone': { ru: 'Уровень пройден!', en: 'Level complete!' },
  'music.medalSub': { ru: 'Все 3 уровня пройдены!', en: 'All 3 levels complete!' },
  'music.easy': { ru: 'Лёгкий', en: 'Easy' },
  'music.medium': { ru: 'Средний', en: 'Medium' },
  'music.hard': { ru: 'Сложный', en: 'Hard' },
  'music.endless': { ru: 'Бесконечный', en: 'Endless' },
  'music.easyDesc': { ru: '3 ноты, медленный темп', en: '3 notes, slow tempo' },
  'music.medDesc': { ru: '4 ноты, быстрее', en: '4 notes, faster' },
  'music.hardDesc': { ru: '5 нот, быстро и сложно', en: '5 notes, fast and tricky' },

  // whack
  'whack.title': { ru: '🔨 Прихлопни крота', en: '🔨 Whack-a-Mole' },
  'whack.desc': { ru: 'Прихлопни кротов, не зевай! 3 уровня — медаль.', en: 'Whack the moles, be quick! 3 levels — medal.' },
  'whack.easy': { ru: 'Лёгкий', en: 'Easy' },
  'whack.medium': { ru: 'Средний', en: 'Medium' },
  'whack.hard': { ru: 'Сложный', en: 'Hard' },
  'whack.easyDesc': { ru: 'Кроты медленные, 30 секунд', en: 'Slow moles, 30 sec' },
  'whack.medDesc': { ru: 'Кроты быстрее, 30 секунд', en: 'Faster moles, 30 sec' },
  'whack.hardDesc': { ru: 'Очень быстрые кроты, 30 секунд', en: 'Very fast moles, 30 sec' },
  'whack.hit': { ru: 'Попал!', en: 'Hit!' },
  'whack.miss': { ru: 'Мимо!', en: 'Miss!' },
  'whack.tip': { ru: '💡 Тапай по кротам, чтобы прихлопнуть!', en: '💡 Tap the moles to whack them!' },
  'whack.timeUp': { ru: 'Время вышло!', en: 'Time\'s up!' },
  'whack.medalSub': { ru: 'Все 3 уровня пройдены!', en: 'All 3 levels complete!' },

  // dots
  'dots.title': { ru: '✏️ Соедини точки', en: '✏️ Connect the Dots' },
  'dots.desc': { ru: 'Соедини точки по порядку — получится картинка! 8 картинок — медаль.', en: 'Connect dots in order to reveal a picture! 8 pictures — medal.' },
  'dots.tip': { ru: '💡 Тапай по точкам по порядку: 1, 2, 3...', en: '💡 Tap dots in order: 1, 2, 3...' },
  'dots.done': { ru: 'Картинка готова!', en: 'Picture complete!' },
  'dots.medalSub': { ru: 'Все 8 картинок собраны!', en: 'All 8 pictures done!' },

  // odd one out
  'game.oddoneout': { ru: 'Лишняя картинка', en: 'Odd One Out' },
  'odd.title': { ru: '🔍 Лишняя картинка', en: '🔍 Odd One Out' },
  'odd.desc': { ru: 'Найди картинку, которая не подходит к остальным. 3 уровня × 5 наборов!', en: 'Find the picture that does not belong. 3 levels × 5 sets!' },
  'odd.tip': { ru: '💡 Тапни по картинке, которая лишняя!', en: '💡 Tap the picture that does not belong!' },
  'odd.correct': { ru: '✅ Верно!', en: '✅ Correct!' },
  'odd.wrong': { ru: '❌ Не та!', en: '❌ Wrong one!' },
  'odd.round': { ru: 'Раунд', en: 'Round' },
  'odd.set': { ru: 'Набор', en: 'Set' },
  'odd.resetSet': { ru: '🔄 Новый набор', en: '🔄 New set' },
  'odd.medalSub': { ru: 'Все 3 уровня пройдены!', en: 'All 3 levels complete!' },
  'odd.allSets': { ru: 'Все 5 наборов пройдены! Сбрось для новых картинок.', en: 'All 5 sets done! Reset for new pictures.' },
  'odd.fullReset': { ru: 'Сбросить прогресс', en: 'Reset progress' },
  'odd.confirmReset': { ru: 'Сбросить весь прогресс этой игры?', en: 'Reset all progress for this game?' },

  // spot the differences
  'game.spotdiff': { ru: 'Найди отличия', en: 'Spot the Differences' },
  'spot.title': { ru: '🔎 Найди отличия', en: '🔎 Spot the Differences' },
  'spot.desc': { ru: 'Найди все отличия между двумя картинками! 3 уровня × 5 наборов.', en: 'Find all differences between two pictures! 3 levels × 5 sets.' },
  'spot.tip': { ru: '💡 Тапай по местам, где есть отличия!', en: '💡 Tap where you see a difference!' },
  'spot.found': { ru: 'найдено', en: 'found' },
  'spot.of': { ru: 'из', en: 'of' },
  'spot.set': { ru: 'Набор', en: 'Set' },
  'spot.resetSet': { ru: '🔄 Новый набор', en: '🔄 New set' },
  'spot.medalSub': { ru: 'Все 3 уровня пройдены!', en: 'All 3 levels complete!' },
  'spot.allSets': { ru: 'Все 5 наборов пройдены! Сбрось для новых картинок.', en: 'All 5 sets done! Reset for new pictures.' },

  // rhythm
  'game.rhythm': { ru: 'Танец с нотами', en: 'Rhythm Tap' },
  'rhy.title': { ru: '🎶 Танец с нотами', en: '🎶 Rhythm Tap' },
  'rhy.desc': { ru: 'Ноты падают под музыку — жми кнопки вовремя! 3 уровня × 5 наборов.', en: 'Notes fall to the music — tap in time! 3 levels × 5 sets.' },
  'rhy.tip': { ru: '💡 Жми кнопку, когда нота касается её!', en: '💡 Tap the button when a note touches it!' },
  'rhy.combo': { ru: 'серия', en: 'combo' },
  'rhy.set': { ru: 'Набор', en: 'Set' },
  'rhy.resetSet': { ru: '🔄 Новый набор', en: '🔄 New set' },
  'rhy.medalSub': { ru: 'Все 3 уровня пройдены!', en: 'All 3 levels complete!' },
  'rhy.allSets': { ru: 'Все 5 наборов пройдены! Сбрось для новых треков.', en: 'All 5 sets done! Reset for new tracks.' },
  'rhy.missed': { ru: 'мимо', en: 'missed' },

  // theme
  'theme.dark': { ru: 'Ночной режим', en: 'Night mode' },
  'theme.light': { ru: 'Дневной режим', en: 'Day mode' },
  'theme.rainbow': { ru: 'Радужный режим — 100%!', en: 'Rainbow mode — 100%!' },

  // music composer save as bg
  'music.saveBg': { ru: '🎵 Поставить фоном', en: '🎵 Set as bg' },
  'music.clearBg': { ru: 'Убрать свою мелодию', en: 'Remove custom' },
  'music.bgSet': { ru: '✅ Своя мелодия — фон', en: '✅ Custom bg set' },
  'music.savedTitle': { ru: 'Сохранённые мелодии', en: 'Saved melodies' },

  // puzzle picture names
  'puzzle.ocean': { ru: 'Подводный мир', en: 'Ocean' },
  'puzzle.farm': { ru: 'Ферма', en: 'Farm' },
  'puzzle.dino': { ru: 'Динозавры', en: 'Dinosaurs' },
  'puzzle.safari': { ru: 'Сафари', en: 'Safari' },
  'puzzle.space': { ru: 'Космос', en: 'Space' },
  'puzzle.castle': { ru: 'Замок', en: 'Castle' },
  'puzzle.forest': { ru: 'Лес', en: 'Forest' },
  'puzzle.beach': { ru: 'Пляж', en: 'Beach' },
  'puzzle.circus': { ru: 'Цирк', en: 'Circus' },
  'puzzle.garden': { ru: 'Сад', en: 'Garden' },

  // runner location names
  'runner.castle': { ru: 'Замок', en: 'Castle' },
  'runner.beach': { ru: 'Пляж', en: 'Beach' },
  'runner.forest': { ru: 'Лес', en: 'Forest' },
  'runner.endless': { ru: 'Бесконечный', en: 'Endless' },

  // drawing picture names
  'draw.rocket': { ru: 'Ракета', en: 'Rocket' },
  'draw.sun': { ru: 'Солнышко', en: 'Sun' },
  'draw.house': { ru: 'Домик', en: 'House' },
  'draw.tree': { ru: 'Дерево', en: 'Tree' },
  'draw.fish': { ru: 'Рыбка', en: 'Fish' },
  'draw.star': { ru: 'Звезда', en: 'Star' },
  'draw.flower': { ru: 'Цветок', en: 'Flower' },
  'draw.car': { ru: 'Машинка', en: 'Car' },
  'draw.boat': { ru: 'Лодочка', en: 'Boat' },
  'draw.balloon': { ru: 'Шарик', en: 'Balloon' },
  'draw.apple': { ru: 'Яблоко', en: 'Apple' },
  'draw.rainbow': { ru: 'Радуга', en: 'Rainbow' },
  'draw.cloud': { ru: 'Облачко', en: 'Cloud' },
  'draw.mountain': { ru: 'Гора', en: 'Mountain' },
  'draw.icecream': { ru: 'Мороженое', en: 'Ice cream' },
  'draw.butterfly': { ru: 'Бабочка', en: 'Butterfly' },
  'draw.bird': { ru: 'Птичка', en: 'Bird' },
  'draw.mushroom': { ru: 'Грибок', en: 'Mushroom' },
  'draw.umbrella': { ru: 'Зонтик', en: 'Umbrella' },
  'draw.cat': { ru: 'Котик', en: 'Cat' },

  // dots picture names
  'dot.star': { ru: 'Звезда', en: 'Star' },
  'dot.house': { ru: 'Домик', en: 'House' },
  'dot.fish': { ru: 'Рыбка', en: 'Fish' },
  'dot.tree': { ru: 'Дерево', en: 'Tree' },
  'dot.boat': { ru: 'Лодочка', en: 'Boat' },
  'dot.heart': { ru: 'Сердечко', en: 'Heart' },
  'dot.umbrella': { ru: 'Зонтик', en: 'Umbrella' },
  'dot.flower': { ru: 'Цветок', en: 'Flower' },

  // runner character names
  'char.hero': { ru: 'Герой', en: 'Hero' },
  'char.robot': { ru: 'Робот', en: 'Robot' },
  'char.cat': { ru: 'Котик', en: 'Cat' },
  'char.dino': { ru: 'Динозавр', en: 'Dino' },
  'char.fox': { ru: 'Лисёнок', en: 'Fox' },
  'char.piastri': { ru: 'Оскар Пиастри', en: 'Oscar Piastri' },
  'char.puk': { ru: 'Человек Пук', en: 'Puk-Man' },
  'char.knight': { ru: 'Рыцарь', en: 'Knight' },

  // menu extras
  'menu.random': { ru: '🎲 Случайная игра', en: '🎲 Random game' },
  'menu.leaderboard': { ru: '🏅 Лидеры', en: '🏅 Leaders' },
  'menu.achievements': { ru: '⭐ Достижения', en: '⭐ Achievements' },
  'menu.close': { ru: 'Закрыть', en: 'Close' },
  'menu.leadersTitle': { ru: 'Лидеры игр', en: 'Game Leaders' },
  'menu.leadersEmpty': { ru: 'Пока нет рекордов. Играй и установи первый!', en: 'No records yet. Play to set the first!' },
  'menu.achTitle': { ru: 'Достижения', en: 'Achievements' },
  'menu.achUnlocked': { ru: 'открыто', en: 'unlocked' },
  'menu.namePrompt': { ru: 'Твоё имя для таблицы лидеров:', en: 'Your name for the leaderboard:' },
  'menu.save': { ru: 'Сохранить', en: 'Save' },
  'menu.time': { ru: 'Время', en: 'Time' },
  'menu.score': { ru: 'Очки', en: 'Score' },

  // puzzle difficulty
  'puzzle.easy': { ru: 'Лёгкий', en: 'Easy' },
  'puzzle.medium': { ru: 'Средний', en: 'Medium' },
  'puzzle.hard': { ru: 'Сложный', en: 'Hard' },
  'puzzle.easyDesc': { ru: '3×3 — 9 деталек', en: '3×3 — 9 pieces' },
  'puzzle.medDesc': { ru: '4×4 — 16 деталек', en: '4×4 — 16 pieces' },
  'puzzle.hardDesc': { ru: '5×5 — 25 деталок', en: '5×5 — 25 pieces' },
  'puzzle.levelN': { ru: 'Уровень', en: 'Level' },
  'puzzle.yourTime': { ru: 'Твоё время', en: 'Your time' },
  'puzzle.best': { ru: 'Рекорд', en: 'Best' },

  // music composer
  'music.composer': { ru: '🎼 Композитор', en: '🎼 Composer' },
  'music.composerDesc': { ru: 'Сочини свою мелодию! Жми ноты и играй.', en: 'Compose your own tune! Tap notes and play.' },
  'music.play': { ru: '▶ Играть', en: '▶ Play' },
  'music.clear': { ru: 'Очистить', en: 'Clear' },
  'music.record': { ru: '⏺ Запись', en: '⏺ Record' },
  'music.noteCount': { ru: 'нот', en: 'notes' },

  // drawing brushes
  'drawing.fill': { ru: 'Заливка', en: 'Fill' },
  'drawing.brushNeon': { ru: 'Неон', en: 'Neon' },
  'drawing.brushSparkle': { ru: 'Блёстки', en: 'Sparkle' },
  'drawing.brushRainbow': { ru: 'Радуга', en: 'Rainbow' },
  'drawing.brushSpray': { ru: 'Спрей', en: 'Spray' },

  // whack 2p
  'whack.mode1p': { ru: '1 игрок', en: '1 player' },
  'whack.mode2p': { ru: '2 игрока', en: '2 players' },
  'whack.p1': { ru: 'Игрок 1', en: 'Player 1' },
  'whack.p2': { ru: 'Игрок 2', en: 'Player 2' },
  'whack.wins': { ru: 'победил!', en: 'wins!' },
}

export function useT() {
  const lang = useGameStore((s) => s.lang)
  return (key: string): string => {
    const entry = T[key]
    if (!entry) return key
    return entry[lang] || entry.ru
  }
}
