# Arduino ↔ backend: контекст прежней реализации

Изучен kreeeeeel/smart_house, commit d6c0c6ff149d497258b9f76a86688ada9767b9b6. Старые секреты не переносились.

Arduino: DHT22 pin 7, MQ135 A0, MQ2 A1, BH1750 I2C. Вентилятор — 6, нагреватель — 3, лампы — 5/8, piezo — 4. SoftwareSerial 10/11, 9600 baud. UART T:…,CO2:…,LUX:…,FA:…,HP:…,LP:…,FP:… примерно раз в 350 мс; измерения раз в 5 секунд. MQ135 передавал сырой ADC, а не калиброванные ppm.

ESP раз в 5 секунд отправлял POST /api/v1/arduino/{housingId}: temperature, carbonDioxide, lux, isThereSmoke, heatPercent, ventPercent, lightPercent, internetPercent (1 минус сумма остальных долей). Firmware uint8 для smoke не совпадал с backend Boolean.

WebFlux рассылал данные в /ws/{housingId}?token=…, читал режимы из Redis, раз в 60 секунд сохранял буфер в PostgreSQL. Очистка буфера до записи могла терять данные. Ответ: target temperature, enabled, ventilationType, lightType, currentHour/currentMinute. ESP передавал управление обратно: RT=…,ET=0/1,V=…,L=…,H=…,M=….

Следующий этап: идентичность устройства отдельно от пользователя, типизированный протокол с версией, калибровка, подтверждения команд и надёжный буфер. Старый endpoint не аутентифицировал устройство, WebSocket передавал токен в URL. Новый протокол в этот этап не входит.

