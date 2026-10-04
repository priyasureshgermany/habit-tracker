/* The fixed library the app draws from: cardio activities, strength exercises,
   ready-made routines, habit templates, diary prompts and feelings.
   Data only — nothing here reads or writes state. */

/* MET values from the Compendium of Physical Activities (2011/2024),
   rounded. kcal = MET × body weight (kg) × hours. */
window.CARDIO = [
  { id:"walk",   name:"Walking",        icon:"🚶", met:{light:2.8, moderate:3.8, vigorous:5.0}, def:"moderate", steps:true, dist:true,
    rec:"30 min brisk walking, 5 days a week, covers the WHO's 150 minutes. Aim for 7,000–10,000 steps a day.",
    tip:"Brisk means you can talk but not sing. That's about 100 steps a minute." },
  { id:"run",    name:"Running",        icon:"🏃", met:{light:7.0, moderate:8.3, vigorous:10.5}, def:"vigorous", steps:true, dist:true,
    rec:"75 min a week of running counts the same as 150 min of moderate exercise. Try 25 min, 3 times a week.",
    tip:"Start with intervals: 1 min jogging, 2 min walking, repeated 8 times." },
  { id:"cycle",  name:"Cycling",        icon:"🚴", met:{light:4.0, moderate:6.8, vigorous:10.0}, def:"moderate", dist:true,
    rec:"30–45 min at an easy-to-moderate pace, 3–5 times a week. Commuting by bike counts too.",
    tip:"Set the saddle so your knee is slightly bent at the bottom of the pedal stroke." },
  { id:"swim",   name:"Swimming",       icon:"🏊", met:{light:5.0, moderate:7.0, vigorous:9.8}, def:"moderate", dist:true,
    rec:"20–30 min, 2–3 times a week. Easy on the joints and works the whole body.",
    tip:"Alternate one length fast, one length easy." },
  { id:"rope",   name:"Skipping rope",  icon:"🪢", met:{light:8.0, moderate:10.0, vigorous:12.0}, def:"vigorous",
    rec:"10–15 min of intervals, 3 times a week. 30 s on, 30 s off.",
    tip:"Jump low, land softly on the balls of your feet, and keep your wrists turning the rope." },
  { id:"stairs", name:"Stair climbing", icon:"🪜", met:{light:4.0, moderate:6.0, vigorous:8.8}, def:"vigorous",
    rec:"10–15 min a day. Taking the stairs at work adds up quickly.",
    tip:"Use the handrail for balance, not to pull yourself up." },
  { id:"hike",   name:"Hiking",         icon:"🥾", met:{light:4.5, moderate:6.0, vigorous:7.8}, def:"moderate", steps:true, dist:true,
    rec:"A 1–2 hour hike at the weekend covers a good part of the week's target.",
    tip:"Hills make it harder. Shorten your stride going uphill." },
  { id:"ellip",  name:"Cross trainer",  icon:"⚙️", met:{light:4.0, moderate:5.0, vigorous:7.5}, def:"moderate",
    rec:"20–40 min, 3–4 times a week. Low impact on the knees.",
    tip:"Stand upright and push through your heels." },
  { id:"row",    name:"Rowing machine", icon:"🚣", met:{light:4.8, moderate:7.0, vigorous:8.5}, def:"moderate",
    rec:"15–20 min, 3 times a week. Works the legs, back and arms together.",
    tip:"Push with the legs first, then lean back, then pull with the arms." },
  { id:"dance",  name:"Dancing",        icon:"💃", met:{light:3.5, moderate:5.0, vigorous:7.3}, def:"moderate",
    rec:"30 min of dancing is a fun way to do moderate cardio.",
    tip:"Zumba and aerobics classes count as vigorous." },
  { id:"yoga",   name:"Yoga",           icon:"🧘", met:{light:2.5, moderate:3.0, vigorous:4.0}, def:"light",
    rec:"15–30 min daily for flexibility, balance and calm. Power yoga counts as moderate.",
    tip:"Breathe slowly through your nose and don't force a stretch." },
  { id:"sport",  name:"Sports / games", icon:"🏸", met:{light:4.0, moderate:5.5, vigorous:7.5}, def:"moderate",
    rec:"Badminton, football or tennis: 45–60 min, once or twice a week.",
    tip:"Warm up for 5 minutes first, since sports involve sudden starts and stops." }
];

/* Muscle groups, in the order the strength screen shows them. `zone` names
   the region of the body map that lights up. */
window.MUSCLES = [
  { id:"abs",       name:"Flat stomach", sub:"Abs & core",     icon:"🔥", zone:["abs","obl"] },
  { id:"biceps",    name:"Biceps",       sub:"Front of arm",   icon:"💪", zone:["bic"] },
  { id:"triceps",   name:"Triceps",      sub:"Back of arm",    icon:"🦾", zone:["tri"] },
  { id:"shoulders", name:"Shoulders",    sub:"Delts",          icon:"🏋️", zone:["sho"] },
  { id:"arms",      name:"Forearms",     sub:"Grip & wrists",  icon:"✊", zone:["fore"] },
  { id:"chest",     name:"Chest",        sub:"Pecs",           icon:"🛡️", zone:["che"] },
  { id:"thighs",    name:"Thighs",       sub:"Quads & hamstrings", icon:"🦵", zone:["thi"] },
  { id:"glutes",    name:"Glutes & hips",sub:"Bum & hips",     icon:"🍑", zone:["glu","thi"] },
  { id:"back",      name:"Back",         sub:"Posture",        icon:"🧍", zone:["bac"] },
  { id:"calves",    name:"Calves",       sub:"Lower legs",     icon:"🦶", zone:["cal"] }
];

/* reps is a number of repetitions, or secs a hold time. `kg` marks exercises
   that take a weight, so the log offers a weight field. */
window.EXERCISES = [
  /* --- abs & core ------------------------------------------------------ */
  { id:"crunch", g:"abs", name:"Crunches", eq:"Mat", lvl:"Beginner", sets:3, reps:15,
    how:["Lie on your back, knees bent, hands lightly behind your head.","Curl your shoulders off the floor by tightening your stomach.","Lower slowly and don't pull on your neck."],
    tip:"Breathe out as you curl up." },
  { id:"plank", g:"abs", name:"Plank", eq:"Mat", lvl:"Beginner", sets:3, secs:30,
    how:["Forearms on the floor, elbows under your shoulders.","Keep your body straight from head to heels.","Tighten your stomach and squeeze your glutes."],
    tip:"Add 5 seconds every week. Stop if your hips start to sag." },
  { id:"legraise", g:"abs", name:"Lying leg raises", eq:"Mat", lvl:"Intermediate", sets:3, reps:12,
    how:["Lie flat with your hands under your hips.","Keep your legs straight and raise them to 90°.","Lower them slowly and stop just above the floor."],
    tip:"Press your lower back into the floor the whole time." },
  { id:"bicycle", g:"abs", name:"Bicycle crunches", eq:"Mat", lvl:"Intermediate", sets:3, reps:20,
    how:["Lie on your back with your hands behind your head and legs raised.","Bring your right elbow towards your left knee as you straighten the right leg.","Switch sides with a smooth pedalling motion."],
    tip:"Slow and controlled works better than fast." },
  { id:"mountain", g:"abs", name:"Mountain climbers", eq:"None", lvl:"Intermediate", sets:3, secs:30,
    how:["Start in a high plank position.","Drive one knee towards your chest, then switch legs quickly.","Keep your hips level with your shoulders."],
    tip:"This works your core and gets your heart rate up, so it doubles as cardio." },
  { id:"twist", g:"abs", name:"Russian twists", eq:"Mat / dumbbell", lvl:"Intermediate", sets:3, reps:20, kg:true,
    how:["Sit with knees bent and lean back slightly.","Twist your upper body from side to side, touching the floor beside your hip.","Lift your feet off the floor to make it harder."],
    tip:"Turn from your ribs, not just your arms." },
  { id:"deadbug", g:"abs", name:"Dead bug", eq:"Mat", lvl:"Beginner", sets:3, reps:10,
    how:["Lie on your back with your arms up and knees at 90°.","Lower your opposite arm and leg towards the floor.","Come back to the start and switch sides."],
    tip:"Your lower back should stay flat on the floor." },
  { id:"flutter", g:"abs", name:"Flutter kicks", eq:"Mat", lvl:"Beginner", sets:3, secs:30,
    how:["Lie flat, hands under your hips, and lift your legs a little.","Kick your legs up and down in small, quick movements.","Keep your stomach tight."],
    tip:"Targets the lower belly." },
  { id:"sideplank", g:"abs", name:"Side plank", eq:"Mat", lvl:"Intermediate", sets:2, secs:25,
    how:["Lie on your side and prop yourself up on one forearm.","Lift your hips so your body forms a straight line.","Hold, then switch sides."],
    tip:"Works the obliques, the muscles at your waist." },

  /* --- biceps ------------------------------------------------------------ */
  { id:"curl", g:"biceps", name:"Dumbbell curl", eq:"Dumbbells", lvl:"Beginner", sets:3, reps:12, kg:true,
    how:["Stand tall with a dumbbell in each hand, palms facing forward.","Bend your elbows and bring the weights up to your shoulders.","Lower slowly over 2–3 seconds."],
    tip:"Keep your elbows close to your sides and don't swing." },
  { id:"hammer", g:"biceps", name:"Hammer curl", eq:"Dumbbells", lvl:"Beginner", sets:3, reps:12, kg:true,
    how:["Hold the dumbbells with your palms facing each other.","Curl them up while keeping that grip.","Lower slowly."],
    tip:"Builds the biceps and forearms together." },
  { id:"conc", g:"biceps", name:"Concentration curl", eq:"Dumbbell", lvl:"Intermediate", sets:3, reps:10, kg:true,
    how:["Sit down and rest your elbow on the inside of your thigh.","Curl the dumbbell towards your shoulder.","Squeeze at the top, then lower."],
    tip:"Use a lighter weight and focus on perfect form." },
  { id:"bandcurl", g:"biceps", name:"Resistance band curl", eq:"Band", lvl:"Beginner", sets:3, reps:15,
    how:["Stand on the band and hold one end in each hand.","Curl up, keeping your elbows still.","Lower slowly against the band's pull."],
    tip:"A good choice for working out at home or while travelling." },
  { id:"chinup", g:"biceps", name:"Chin-ups", eq:"Pull-up bar", lvl:"Advanced", sets:3, reps:6,
    how:["Hang from the bar with your palms facing you.","Pull up until your chin is over the bar.","Lower yourself all the way down under control."],
    tip:"Can't do one yet? Jump up and lower yourself slowly." },

  /* --- triceps ----------------------------------------------------------- */
  { id:"dips", g:"triceps", name:"Chair dips", eq:"Chair / bench", lvl:"Beginner", sets:3, reps:12,
    how:["Put your hands on the edge of a chair behind you.","Bend your elbows to lower your body until your arms reach 90°.","Push back up."],
    tip:"Keep your back close to the chair. Bending your knees makes it easier." },
  { id:"ohext", g:"triceps", name:"Overhead extension", eq:"Dumbbell", lvl:"Beginner", sets:3, reps:12, kg:true,
    how:["Hold one dumbbell with both hands above your head.","Lower it behind your head by bending your elbows.","Straighten your arms to lift it back up."],
    tip:"Keep your elbows pointing forward." },
  { id:"diamond", g:"triceps", name:"Close-grip push-ups", eq:"None", lvl:"Intermediate", sets:3, reps:10,
    how:["Get into a push-up position with your hands close together under your chest.","Lower yourself with your elbows close to your body.","Push back up."],
    tip:"Do them from your knees until you're stronger." },
  { id:"kickback", g:"triceps", name:"Tricep kickback", eq:"Dumbbell", lvl:"Beginner", sets:3, reps:12, kg:true,
    how:["Lean forward with a flat back, elbow bent at 90°.","Straighten your arm backwards.","Squeeze, then bend your arm back slowly."],
    tip:"Only your forearm should move." },
  { id:"skull", g:"triceps", name:"Lying extension", eq:"Dumbbells", lvl:"Intermediate", sets:3, reps:10, kg:true,
    how:["Lie on a bench or the floor with your arms straight up.","Bend your elbows to lower the weights beside your head.","Straighten your arms again."],
    tip:"Use a weight you can control." },

  /* --- shoulders --------------------------------------------------------- */
  { id:"ohp", g:"shoulders", name:"Shoulder press", eq:"Dumbbells", lvl:"Beginner", sets:3, reps:10, kg:true,
    how:["Hold the dumbbells at shoulder height, palms facing forward.","Press them overhead until your arms are straight.","Lower them back to your shoulders."],
    tip:"Tighten your stomach so your back doesn't arch." },
  { id:"lateral", g:"shoulders", name:"Lateral raise", eq:"Dumbbells", lvl:"Beginner", sets:3, reps:12, kg:true,
    how:["Hold the dumbbells at your sides.","Raise your arms out to the sides until they're at shoulder height.","Lower slowly."],
    tip:"Use light weights and keep your elbows slightly bent." },
  { id:"front", g:"shoulders", name:"Front raise", eq:"Dumbbells", lvl:"Beginner", sets:3, reps:12, kg:true,
    how:["Hold the dumbbells in front of your thighs.","Lift your straight arms forward to shoulder height.","Lower under control."],
    tip:"Alternate arms if it's too hard with both." },
  { id:"pike", g:"shoulders", name:"Pike push-ups", eq:"None", lvl:"Intermediate", sets:3, reps:8,
    how:["Push your hips up so your body forms an upside-down V.","Bend your elbows to lower your head towards the floor.","Push back up."],
    tip:"A bodyweight shoulder press you can do anywhere." },
  { id:"arnold", g:"shoulders", name:"Arnold press", eq:"Dumbbells", lvl:"Intermediate", sets:3, reps:10, kg:true,
    how:["Start with the dumbbells at your chin, palms facing you.","Rotate your palms outward as you press up.","Reverse the movement on the way down."],
    tip:"Works all three parts of the shoulder." },
  { id:"reardelt", g:"shoulders", name:"Rear delt fly", eq:"Dumbbells", lvl:"Beginner", sets:3, reps:12, kg:true,
    how:["Bend forward at the hips with a flat back.","Raise your arms out to the sides.","Squeeze your shoulder blades together, then lower."],
    tip:"Helps fix posture from sitting at a desk." },

  /* --- forearms / arms ---------------------------------------------------- */
  { id:"wristcurl", g:"arms", name:"Wrist curls", eq:"Dumbbells", lvl:"Beginner", sets:3, reps:15, kg:true,
    how:["Rest your forearms on your thighs, palms up, wrists over your knees.","Curl the weights up using only your wrists.","Lower slowly."],
    tip:"Do the same with palms down for the top of the forearm." },
  { id:"farmer", g:"arms", name:"Farmer's carry", eq:"Dumbbells / bags", lvl:"Beginner", sets:3, secs:40, kg:true,
    how:["Pick up a heavy weight in each hand.","Walk tall with your shoulders back.","Walk for the set time, then put them down carefully."],
    tip:"Shopping bags count. Great for grip strength." },
  { id:"revcurl", g:"arms", name:"Reverse curl", eq:"Dumbbells", lvl:"Intermediate", sets:3, reps:12, kg:true,
    how:["Hold the dumbbells with your palms facing down.","Curl them up while keeping that grip.","Lower slowly."],
    tip:"Works your forearms and the outer biceps." },
  { id:"armcircle", g:"arms", name:"Arm circles", eq:"None", lvl:"Beginner", sets:2, secs:30,
    how:["Hold your arms straight out to the sides.","Make small circles forward, gradually making them bigger.","Reverse direction halfway through."],
    tip:"A good warm-up, and it tones the whole arm." },

  /* --- chest ------------------------------------------------------------- */
  { id:"pushup", g:"chest", name:"Push-ups", eq:"None", lvl:"Beginner", sets:3, reps:10,
    how:["Place your hands slightly wider than your shoulders.","Lower your chest towards the floor with your body straight.","Push back up."],
    tip:"From your knees or against a wall is fine. Build up slowly." },
  { id:"incline", g:"chest", name:"Incline push-ups", eq:"Bench / table", lvl:"Beginner", sets:3, reps:12,
    how:["Put your hands on a bench or table edge.","Lower your chest to the edge.","Push back up."],
    tip:"The easiest push-up version. Works the lower chest." },
  { id:"bench", g:"chest", name:"Dumbbell chest press", eq:"Dumbbells / bench", lvl:"Intermediate", sets:3, reps:10, kg:true,
    how:["Lie on your back with the dumbbells at chest level.","Press them up until your arms are straight.","Lower slowly to your chest."],
    tip:"You can do this on the floor if you don't have a bench." },
  { id:"fly", g:"chest", name:"Chest fly", eq:"Dumbbells", lvl:"Intermediate", sets:3, reps:12, kg:true,
    how:["Lie on your back with your arms up and elbows slightly bent.","Open your arms out wide like a hug.","Bring them back together over your chest."],
    tip:"Use light weights. The stretch at the bottom is what does the work." },
  { id:"widepush", g:"chest", name:"Wide push-ups", eq:"None", lvl:"Intermediate", sets:3, reps:10,
    how:["Place your hands well wider than your shoulders.","Lower your chest towards the floor.","Push back up."],
    tip:"Works the outer chest more than a regular push-up." },

  /* --- thighs ------------------------------------------------------------ */
  { id:"squat", g:"thighs", name:"Squats", eq:"None / dumbbells", lvl:"Beginner", sets:3, reps:15, kg:true,
    how:["Stand with your feet shoulder-width apart.","Sit back and down as if into a chair, chest up.","Push through your heels to stand."],
    tip:"Keep your knees in line with your toes." },
  { id:"lunge", g:"thighs", name:"Lunges", eq:"None / dumbbells", lvl:"Beginner", sets:3, reps:10, kg:true,
    how:["Take a big step forward.","Lower until both knees are at 90°.","Push back to the start and switch legs."],
    tip:"Your front knee stays over your ankle." },
  { id:"wallsit", g:"thighs", name:"Wall sit", eq:"Wall", lvl:"Beginner", sets:3, secs:40,
    how:["Lean your back against a wall.","Slide down until your thighs are parallel to the floor.","Hold the position."],
    tip:"Builds strong thighs without any equipment." },
  { id:"stepup", g:"thighs", name:"Step-ups", eq:"Step / chair", lvl:"Beginner", sets:3, reps:12, kg:true,
    how:["Step up onto a sturdy step with one foot.","Push through that heel to bring the other foot up.","Step down and repeat."],
    tip:"Do all the reps on one leg, then switch." },
  { id:"bulgarian", g:"thighs", name:"Bulgarian split squat", eq:"Bench", lvl:"Advanced", sets:3, reps:8, kg:true,
    how:["Put your back foot on a bench behind you.","Lower your back knee towards the floor.","Push up through your front heel."],
    tip:"Hard, but one of the best exercises for your thighs." },
  { id:"sumo", g:"thighs", name:"Sumo squat", eq:"Dumbbell", lvl:"Beginner", sets:3, reps:15, kg:true,
    how:["Stand with your feet wide and toes turned out.","Hold a weight between your legs and squat down.","Squeeze your inner thighs as you stand up."],
    tip:"Works the inner thighs." },

  /* --- glutes ------------------------------------------------------------ */
  { id:"bridge", g:"glutes", name:"Glute bridge", eq:"Mat", lvl:"Beginner", sets:3, reps:15, kg:true,
    how:["Lie on your back with your knees bent and feet flat.","Lift your hips until your body is straight from knees to shoulders.","Squeeze your glutes at the top, then lower."],
    tip:"Hold for 2 seconds at the top of each rep." },
  { id:"donkey", g:"glutes", name:"Donkey kicks", eq:"Mat", lvl:"Beginner", sets:3, reps:15,
    how:["Start on your hands and knees.","Kick one leg up behind you, keeping the knee bent.","Lower it, then switch legs."],
    tip:"Don't arch your lower back." },
  { id:"clam", g:"glutes", name:"Clamshells", eq:"Mat / band", lvl:"Beginner", sets:3, reps:15,
    how:["Lie on your side with your knees bent.","Keep your feet together and open your top knee.","Close it slowly."],
    tip:"A band around your knees makes it harder." },

  /* --- back -------------------------------------------------------------- */
  { id:"superman", g:"back", name:"Superman", eq:"Mat", lvl:"Beginner", sets:3, reps:12,
    how:["Lie face down with your arms stretched out in front.","Lift your arms, chest and legs off the floor.","Hold for 2 seconds, then lower."],
    tip:"A great way to balance out a day of sitting." },
  { id:"row", g:"back", name:"Bent-over row", eq:"Dumbbells", lvl:"Beginner", sets:3, reps:12, kg:true,
    how:["Bend forward at the hips with a flat back.","Pull the dumbbells up to your ribs.","Lower them slowly."],
    tip:"Squeeze your shoulder blades together at the top." },
  { id:"birddog", g:"back", name:"Bird dog", eq:"Mat", lvl:"Beginner", sets:3, reps:10,
    how:["Start on your hands and knees.","Reach one arm forward and the opposite leg back.","Hold, return, and switch sides."],
    tip:"Keep your hips level, as if balancing a glass on your back." },

  /* --- calves ------------------------------------------------------------ */
  { id:"calfraise", g:"calves", name:"Calf raises", eq:"Step / none", lvl:"Beginner", sets:3, reps:20, kg:true,
    how:["Stand on the edge of a step with your heels hanging off.","Rise up onto your toes as high as you can.","Lower your heels below the step."],
    tip:"Do them on one leg to make it harder." },
  { id:"jumpjack", g:"calves", name:"Jumping jacks", eq:"None", lvl:"Beginner", sets:3, secs:30,
    how:["Jump your feet out wide while raising your arms overhead.","Jump back to the start.","Keep a steady rhythm."],
    tip:"Works your calves and doubles as a warm-up." }
];

/* Ready-made sessions: a list of [exercise id, sets, reps|null, secs|null]
   and the rest between sets, in seconds. */
window.ROUTINES = [
  { id:"flat", name:"Flat stomach", icon:"🔥", min:15, lvl:"Beginner", rest:20, color:"#F97316",
    about:"A core workout for every other day. To lose belly fat you also need cardio and good eating, because you can't burn fat from one spot.",
    items:[["crunch",3,15],["plank",3,null,30],["bicycle",3,20],["legraise",3,12],["mountain",3,null,30],["sideplank",2,null,25]] },
  { id:"arms", name:"Arms & shoulders", icon:"💪", min:25, lvl:"Beginner", rest:45, color:"#8B5CF6",
    about:"Biceps, triceps and shoulders. All you need is a pair of dumbbells. Do it twice a week.",
    items:[["curl",3,12],["dips",3,12],["ohp",3,10],["hammer",3,12],["ohext",3,12],["lateral",3,12]] },
  { id:"chest", name:"Chest & back", icon:"🛡️", min:20, lvl:"Beginner", rest:45, color:"#0EA5E9",
    about:"Push and pull exercises together for a balanced upper body and better posture.",
    items:[["pushup",3,10],["row",3,12],["incline",3,12],["superman",3,12],["fly",3,12]] },
  { id:"legs", name:"Leg day", icon:"🦵", min:25, lvl:"Beginner", rest:45, color:"#10B981",
    about:"Thighs, glutes and calves. Your legs are your biggest muscles, so this burns the most calories.",
    items:[["squat",3,15],["lunge",3,10],["bridge",3,15],["wallsit",3,null,40],["calfraise",3,20]] },
  { id:"full", name:"Full body starter", icon:"⚡", min:20, lvl:"Beginner", rest:30, color:"#EC4899",
    about:"Three times a week, with a rest day in between. No equipment needed.",
    items:[["jumpjack",2,null,30],["squat",3,12],["pushup",3,8],["bridge",3,12],["plank",3,null,30],["birddog",2,10]] },
  { id:"desk", name:"Desk break", icon:"🪑", min:7, lvl:"Easy", rest:15, color:"#64748B",
    about:"Seven minutes to undo some of a long day at the desk.",
    items:[["armcircle",1,null,30],["squat",2,10],["reardelt",2,12],["calfraise",2,15],["birddog",1,8]] }
];

window.HABIT_CATEGORIES = [
  { id:"health",  name:"Health",       icon:"❤️" },
  { id:"fitness", name:"Fitness",      icon:"🏃" },
  { id:"mind",    name:"Mind",         icon:"🧠" },
  { id:"learn",   name:"Learning",     icon:"📚" },
  { id:"work",    name:"Productivity", icon:"🎯" },
  { id:"social",  name:"Relationships",icon:"🤝" },
  { id:"money",   name:"Money",        icon:"💶" },
  { id:"home",    name:"Home",         icon:"🏡" },
  { id:"other",   name:"Other",        icon:"✨" }
];

/* kind: check = done or not; count = a number towards a target; time = minutes. */
window.HABIT_TEMPLATES = [
  { name:"Drink water", icon:"💧", cat:"health", kind:"count", target:8, unit:"glasses", part:"any", color:"#0EA5E9" },
  { name:"Walk 8,000 steps", icon:"🚶", cat:"fitness", kind:"count", target:8000, unit:"steps", part:"any", color:"#10B981" },
  { name:"Morning workout", icon:"🏋️", cat:"fitness", kind:"time", target:20, unit:"min", part:"morning", color:"#F97316", freq:{type:"weekdays", days:[1,3,5]} },
  { name:"Meditate", icon:"🧘", cat:"mind", kind:"time", target:10, unit:"min", part:"morning", color:"#8B5CF6" },
  { name:"Read", icon:"📖", cat:"learn", kind:"time", target:20, unit:"min", part:"evening", color:"#6366F1" },
  { name:"Learn German", icon:"🗣️", cat:"learn", kind:"time", target:15, unit:"min", part:"any", color:"#EAB308" },
  { name:"Sleep by 11 pm", icon:"😴", cat:"health", kind:"check", part:"evening", color:"#334155" },
  { name:"Eat fruit & veg", icon:"🥗", cat:"health", kind:"count", target:5, unit:"portions", part:"any", color:"#22C55E" },
  { name:"No sugar", icon:"🍬", cat:"health", kind:"check", quit:true, part:"any", color:"#EF4444" },
  { name:"No phone in bed", icon:"📵", cat:"mind", kind:"check", quit:true, part:"evening", color:"#64748B" },
  { name:"Journal", icon:"✍️", cat:"mind", kind:"check", part:"evening", color:"#D946EF" },
  { name:"Stretch", icon:"🤸", cat:"fitness", kind:"time", target:10, unit:"min", part:"morning", color:"#14B8A6" },
  { name:"Call family", icon:"📞", cat:"social", kind:"check", part:"any", color:"#F43F5E", freq:{type:"weekly", times:2} },
  { name:"Track spending", icon:"💶", cat:"money", kind:"check", part:"evening", color:"#0F766E" },
  { name:"Tidy up 10 min", icon:"🧹", cat:"home", kind:"time", target:10, unit:"min", part:"evening", color:"#A16207" },
  { name:"Vitamins", icon:"💊", cat:"health", kind:"check", part:"morning", color:"#F59E0B" }
];

window.HABIT_ICONS = ["💧","🚶","🏃","🚴","🏋️","🧘","📖","📚","✍️","🧠","😴","🛏️","🥗","🍎","🥛","☕","🚭","🍬","📵","💊",
  "🦷","🧴","🧹","🪴","🐕","🎸","🎨","💻","🎯","⏰","🙏","❤️","📞","🤝","💶","🗣️","🌅","🌙","🌿","⭐"];

window.HABIT_COLORS = ["#8B5CF6","#6366F1","#0EA5E9","#14B8A6","#10B981","#22C55E","#EAB308","#F59E0B","#F97316","#EF4444","#F43F5E","#EC4899","#D946EF","#64748B"];

window.MOODS = [
  { v:1, face:"😞", name:"Awful", color:"#EF4444" },
  { v:2, face:"😕", name:"Low",   color:"#F97316" },
  { v:3, face:"😐", name:"Okay",  color:"#EAB308" },
  { v:4, face:"🙂", name:"Good",  color:"#84CC16" },
  { v:5, face:"😄", name:"Great", color:"#10B981" }
];

window.FEELINGS = ["Grateful","Happy","Calm","Proud","Excited","Loved","Motivated","Relaxed","Hopeful",
  "Tired","Stressed","Anxious","Sad","Frustrated","Lonely","Bored","Overwhelmed","Angry","Sick"];

window.PROMPTS = [
  "What made you smile today?",
  "What are three things you're grateful for?",
  "What was the hardest part of today, and how did you handle it?",
  "What did you learn today?",
  "Who made your day better?",
  "What would make tomorrow great?",
  "What drained your energy today, and what gave you energy?",
  "Describe one small win from today.",
  "How did your body feel today?",
  "What are you looking forward to this week?"
];

window.QUOTES = [
  ["We are what we repeatedly do. Excellence, then, is not an act, but a habit.", "Will Durant"],
  ["Small daily improvements are the key to staggering long-term results.", "Unknown"],
  ["You do not rise to the level of your goals. You fall to the level of your systems.", "James Clear"],
  ["Motivation gets you going, but discipline keeps you growing.", "John C. Maxwell"],
  ["The secret of getting ahead is getting started.", "Mark Twain"],
  ["Take care of your body. It's the only place you have to live.", "Jim Rohn"],
  ["A journey of a thousand miles begins with a single step.", "Lao Tzu"],
  ["Success is the sum of small efforts, repeated day in and day out.", "Robert Collier"],
  ["Don't break the chain.", "Jerry Seinfeld"],
  ["It does not matter how slowly you go as long as you do not stop.", "Confucius"]
];
