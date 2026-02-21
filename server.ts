import 'dotenv/config';
import { createApp } from './src/app';

const PORT = Number(process.env.PORT) || 9000;

createApp().then((app) => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
