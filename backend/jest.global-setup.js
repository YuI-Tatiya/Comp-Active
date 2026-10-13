// รันเทสต์ทั้งชุดในเขตเวลา UTC เหมือน container จริง (Docker) — เครื่อง dev อยู่เวลาไทย ถ้าปล่อยตามเครื่อง
// โค้ดที่พึ่งเขตเวลาของ process (getHours()/toLocale*() ไม่ระบุ timeZone) จะผ่านเทสต์ทั้งที่พังตอน deploy
// ต้องตั้งที่ globalSetup เพราะ process.env ในไฟล์เทสต์ของ Jest เป็นสำเนา ตั้งค่า TZ ในเทสต์จึงไม่มีผลกับนาฬิกาของ Node
module.exports = async () => {
  process.env.TZ = 'UTC';
};
