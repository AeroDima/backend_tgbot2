import { Telegraf, Scenes, session } from 'telegraf';
import * as dotenv from 'dotenv';
import { profileWizard, PROFILE_WIZARD_ID } from './scenes/profileWizard.js';
import { addMealWizard, ADD_MEAL_WIZARD_ID } from './scenes/addMealWizard.js';
import { initDB, getUserProfile, getTodayMeals } from './database/db.js';

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

// Commands
bot.start(async (ctx) => {
  await ctx.reply(
    '👋 Вітаю! Я бот для підрахунку калорій.\n\n' +
      'Команди:\n' +
      '/set_profile - Налаштувати профіль (вік, вага, зріст...)\n' +
      '/my_profile - Переглянути мій профіль\n' +
      '/add_meal - Додати прийом їжі\n' +
      '/today - Статистика за сьогодні'
  );
});

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

  await ctx.reply(
    `📋 Ваш профіль:\n\n` +
      `🎂 Вік: ${profile.age}\n` +
      `📏 Зріст: ${profile.height} см\n` +
      `⚖️ Вага: ${profile.weight} кг\n` +
      `👤 Стать: ${profile.sex}\n` +
      `🏃 Активність: ${profile.activity}\n\n` +
      `🔥 BMR: ${Math.round(profile.bmr ?? 0)} ккал\n` +
      `🍎 TDEE: ${Math.round(profile.tdee ?? 0)} ккал`
  );
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
