import { Telegraf, Scenes, session } from 'telegraf';
import * as dotenv from 'dotenv';
import { profileWizard, PROFILE_WIZARD_ID, userProfiles } from './scenes/profileWizard.js';

dotenv.config();

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('ERROR: BOT_TOKEN is not defined in .env file');
  process.exit(1);
}

const bot = new Telegraf<Scenes.WizardContext>(token);

// Create the stage with our profile wizard
const stage = new Scenes.Stage<Scenes.WizardContext>([profileWizard]);

// Middleware
bot.use(session());
bot.use(stage.middleware());

// Commands
bot.start(async (ctx) => {
  await ctx.reply(
    '👋 Вітаю! Я бот для підрахунку калорій.\n\n' +
      'Команди:\n' +
      '/set_profile - Налаштувати профіль (вік, вага, зріст...)\n' +
      '/my_profile - Переглянути мій профіль'
  );
});

bot.command('set_profile', (ctx) => {
  return ctx.scene.enter(PROFILE_WIZARD_ID);
});

bot.command('my_profile', async (ctx) => {
  const userId = ctx.from.id;
  const profile = userProfiles[userId];

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

// Launch bot
bot.launch().then(() => {
  console.log('🚀 Бот запущений!');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
