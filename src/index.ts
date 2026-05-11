import { Telegraf, Scenes, session, Markup } from 'telegraf';
import * as dotenv from 'dotenv';
import { profileWizard, PROFILE_WIZARD_ID } from './scenes/profileWizard.js';
import { addMealWizard, ADD_MEAL_WIZARD_ID } from './scenes/addMealWizard.js';
import { initDB, getUserProfile, getTodayMeals } from './database/db.js';
import { getMealIdeas } from './services/aiService.js';

dotenv.config();

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('ERROR: BOT_TOKEN is not defined in .env file');
  process.exit(1);
}

// Initialize Database
initDB();

const bot = new Telegraf<Scenes.WizardContext>(token);

// Create the stage
const stage = new Scenes.Stage<Scenes.WizardContext>([profileWizard, addMealWizard]);

// Middleware
bot.use(session());
bot.use(stage.middleware());

const mainKeyboard = Markup.keyboard([
  ['🥗 Add Meal', '📅 Today'],
  ['📋 Plan', '👤 Profile'],
]).resize();

// Commands
bot.start(async (ctx) => {
  await ctx.reply(
    '👋 Вітаю! Я бот для підрахунку калорій.\n\n' +
      'Я допоможу вам стежити за харчуванням та досягати цілей.\n\n' +
      'Команди:\n' +
      '/set_profile - Налаштувати профіль\n' +
      '/my_profile - Переглянути профіль\n' +
      '/add_meal - Додати їжу\n' +
      '/today - Статистика за сьогодні\n' +
      '/plan - Ваш персональний план',
    mainKeyboard
  );
});

bot.hears('🥗 Add Meal', (ctx) => ctx.scene.enter(ADD_MEAL_WIZARD_ID));
bot.hears('📅 Today', (ctx) => ctx.command('today'));
bot.hears('📋 Plan', (ctx) => ctx.command('plan'));
bot.hears('👤 Profile', (ctx) => ctx.command('my_profile'));

bot.command('set_profile', (ctx) => {
  return ctx.scene.enter(PROFILE_WIZARD_ID);
});

bot.command('add_meal', (ctx) => {
  return ctx.scene.enter(ADD_MEAL_WIZARD_ID);
});

bot.command('my_profile', async (ctx) => {
  const userId = ctx.from.id;
  const profile = getUserProfile(userId);

  if (!profile) {
    return ctx.reply('⚠️ Профіль не знайдено. Спочатку скористайтеся командою /set_profile');
  }

  const goalText = {
    lose: '🔻 Схуднення',
    maintain: '⚖️ Підтримка',
    gain: '🔺 Набір маси',
  }[profile.goal] || 'Не обрано';

  await ctx.reply(
    `📋 Ваш профіль:\n\n` +
      `🎂 Вік: ${profile.age}\n` +
      `📏 Зріст: ${profile.height} см\n` +
      `⚖️ Вага: ${profile.weight} кг\n` +
      `👤 Стать: ${profile.sex}\n` +
      `🏃 Активність: ${profile.activity}\n` +
      `🎯 Ціль: ${goalText}\n\n` +
      `🔥 BMR: ${Math.round(profile.bmr ?? 0)} ккал\n` +
      `🍎 TDEE: ${Math.round(profile.tdee ?? 0)} ккал`
  );
});

bot.command('plan', async (ctx) => {
  const userId = ctx.from.id;
  const profile = getUserProfile(userId);

  if (!profile) {
    return ctx.reply('⚠️ Профіль не знайдено. Спочатку заповніть профіль через /set_profile');
  }

  if (!profile.goal) {
    return ctx.reply('⚠️ Ціль не обрана. Оновіть профіль через /set_profile і виберіть вашу ціль');
  }

  const adjustment = {
    lose: -400,
    maintain: 0,
    gain: 300,
  }[profile.goal];

  const recommendedCalories = (profile.tdee ?? 0) + adjustment;
  const goalText = {
    lose: 'схуднення',
    maintain: 'підтримка ваги',
    gain: 'набір маси',
  }[profile.goal];

  const explanation = {
    lose: 'Це помірний дефіцит калорій для поступового зниження ваги.',
    maintain: 'Це кількість калорій для підтримки вашої поточної ваги.',
    gain: 'Це профіцит калорій для здорового набору мʼязової маси.',
  }[profile.goal];

  await ctx.reply('⏳ Генерую ваш план та ідеї страв...');

  const ideas = await getMealIdeas(profile.goal, recommendedCalories);
  let ideasText = '\n\n💡 *Ідеї страв:*\n';
  ideas.forEach(idea => {
    ideasText += `• ${idea}\n`;
  });

  const message = 
    `📋 *Ваш персональний план*\n\n` +
    `🎯 Ваша ціль: *${goalText}*\n` +
    `🔥 Рекомендована норма: *${Math.round(recommendedCalories)} ккал / день*\n\n` +
    `${explanation}` +
    `${ideasText}\n` +
    `⚠️ _Це загальні рекомендації, а не медична порада._`;

  await ctx.reply(message, { parse_mode: 'Markdown' });
});

bot.command('today', async (ctx) => {
  const userId = ctx.from.id;
  const meals = getTodayMeals(userId);

  if (meals.length === 0) {
    return ctx.reply('📅 Сьогодні ще немає записаних прийомів їжі.');
  }

  let totalCalories = 0;
  let message = '📅 Сьогодні ви зʼїли:\n\n';

  meals.forEach((meal, index) => {
    totalCalories += meal.calories_estimated;
    const time = new Date(meal.timestamp).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    message += `${index + 1}. 🕒 ${time} — *${meal.raw_text}* (${Math.round(meal.calories_estimated)} ккал)\n`;
  });

  message += `\n🔥 *Всього: ${Math.round(totalCalories)} ккал*`;

  await ctx.reply(message, { parse_mode: 'Markdown' });
});

// Launch bot
bot.launch().then(() => {
  console.log('🚀 Бот запущений!');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
