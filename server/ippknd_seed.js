const db = require('./src/db');

const ippkndQuizzes = [{
  title: 'Arnav & Khushi Quiz 1: Rabba Ve Sparks',
  category: 'Entertainment',
  difficulty: 'Intermediate',
  questions: [
    { type: 'multiple_choice', text: 'What usually triggered a Rabba Ve moment?', options: ['Arguments', 'Cooking', 'Dance practice', 'Phone calls'], correctAnswer: 'Arguments' },
    { type: 'multiple_choice', text: 'Where did their legendary Diwali almost-kiss happen?', options: ['Poolside', 'Living room', 'Office', 'Terrace'], correctAnswer: 'Poolside' },
    { type: 'true_false', text: 'Arnav’s heartbeat sped up whenever Khushi tripped near him.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'What color was Khushi wearing during the guest house rescue?', options: ['White', 'Red', 'Green', 'Pink'], correctAnswer: 'Green' },
    { type: 'multiple_choice', text: 'Who interrupted many early Rabba Ve moments?', options: ['Anjali', 'Payal', 'NK', 'Manorama'], correctAnswer: 'Anjali' },
    { type: 'true_false', text: 'Khushi was always the first to break eye contact.', correctAnswer: 'false' },
    { type: 'multiple_choice', text: 'What did Arnav often drop or freeze during Rabba Ve scenes?', options: ['His breath', 'His phone', 'His coffee', 'His laptop'], correctAnswer: 'His breath' },
    { type: 'multiple_choice', text: 'Which object caused many close-proximity scenes?', options: ['Dupatta', 'Laptop', 'Phone', 'Keychain'], correctAnswer: 'Dupatta' },
    { type: 'multiple_choice', text: 'What was Khushi’s typical reaction to Rabba Ve?', options: ['Shock & confusion', 'Bold flirtation', 'Silent admiration', 'Anger'], correctAnswer: 'Shock & confusion' },
    { type: 'true_false', text: 'Arnav initiated more physical proximity moments than Khushi.', correctAnswer: 'true' }
  ]
},
{
  title: 'Arnav & Khushi Quiz 2: Office Tension',
  category: 'Entertainment',
  difficulty: 'Intermediate',
  questions: [
    { type: 'multiple_choice', text: 'What was Khushi hired to do at AR initially?', options: ['Event-related work', 'Fashion designing', 'Assistant duties', 'Finance work'], correctAnswer: 'Event-related work' },
    { type: 'multiple_choice', text: 'Which incident softened ASR in the office?', options: ['Khushi fainting', 'Coffee spill', 'Contract confusion', 'File argument'], correctAnswer: 'Khushi fainting' },
    { type: 'true_false', text: 'Arnav once purposely scared Khushi with the lights off in the office.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'What was Arnav’s favorite taunt for Khushi in the office?', options: ['Unbelievable', 'What the—', 'Ridiculous', 'Stop it'], correctAnswer: 'Unbelievable' },
    { type: 'multiple_choice', text: 'Khushi decorated Arnav’s cabin with which theme?', options: ['Hearts', 'Jalebis', 'Colorful streamers', 'Rab Ne Bana Di Jodi'], correctAnswer: 'Hearts' },
    { type: 'true_false', text: 'The office was the place where Arnav first physically caught Khushi from falling.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'Who teased Arnav about his behavior with Khushi at AR?', options: ['Anjali', 'Aman', 'Lavanya', 'NK'], correctAnswer: 'Lavanya' },
    { type: 'multiple_choice', text: 'Why did Arnav fire Khushi the first time?', options: ['She ruined his fashion show', 'She overspoke', 'He misunderstood her role', 'For missing a deadline'], correctAnswer: 'She ruined his fashion show' },
    { type: 'multiple_choice', text: 'What food did Khushi bring multiple times to AR to annoy Arnav?', options: ['Jalebi', 'Pakoras', 'Samosa', 'Kachori'], correctAnswer: 'Jalebi' },
    { type: 'true_false', text: 'Arnav apologized clearly after their first office fight.', correctAnswer: 'false' }
  ]
},
{
  title: 'Arnav & Khushi Quiz 3: Forced Marriage Drama',
  category: 'Entertainment',
  difficulty: 'Advanced',
  questions: [
    { type: 'multiple_choice', text: 'Why did Arnav force Khushi to marry him?', options: ['Misunderstanding with Shyam', 'Family pressure', 'Confession gone wrong', 'To save her reputation'], correctAnswer: 'Misunderstanding with Shyam' },
    { type: 'multiple_choice', text: 'How long was their forced marriage contract?', options: ['6 months', '1 year', '3 months', 'No contract'], correctAnswer: '6 months' },
    { type: 'true_false', text: 'Khushi cried on the wedding day because she felt betrayed.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'Which ritual Khushi wasn’t allowed to perform initially?', options: ['Graha Pravesh', 'Karva Chauth', 'Haldi', 'Pag Phera'], correctAnswer: 'Graha Pravesh' },
    { type: 'multiple_choice', text: 'Who noticed something was terribly wrong between them first?', options: ['Anjali', 'NK', 'Payal', 'Manorama'], correctAnswer: 'NK' },
    { type: 'true_false', text: 'Arnav and Khushi slept in the same bed immediately after marriage.', correctAnswer: 'false' },
    { type: 'multiple_choice', text: 'What did Khushi put on the recliner to annoy ASR?', options: ['Her pillow', 'Her stars', 'Her blanket', 'Her slippers'], correctAnswer: 'Her stars' },
    { type: 'multiple_choice', text: 'During the forced marriage, Arnav showed care secretly by…', options: ['Bringing her food', 'Saving her from cold', 'Defending her from Manorama', 'All of the above'], correctAnswer: 'All of the above' },
    { type: 'multiple_choice', text: 'Where did Khushi cry alone after marriage?', options: ['Poolside', 'Kitchen', 'Guest room', 'Terrace'], correctAnswer: 'Poolside' },
    { type: 'true_false', text: 'The forced marriage arc increased their emotional closeness despite conflicts.', correctAnswer: 'true' }
  ]
},
{
  title: 'Arnav & Khushi Quiz 4: The Tender Moments',
  category: 'Entertainment',
  difficulty: 'Intermediate',
  questions: [
    { type: 'multiple_choice', text: 'When did Arnav first gently tuck Khushi’s hair behind her ear?', options: ['After she sprained her ankle', 'During Diwali', 'At the guest house', 'During sangeet'], correctAnswer: 'After she sprained her ankle' },
    { type: 'multiple_choice', text: 'What did Khushi gift Arnav that surprised him?', options: ['A plant', 'A sugar-free sweet', 'A hand-made card', 'A shirt'], correctAnswer: 'A sugar-free sweet' },
    { type: 'true_false', text: 'Arnav once covered Khushi with his own shawl without her noticing.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'Where did Arnav carry Khushi in his arms for the first time?', options: ['Guest house', 'Stairs of Shantivan', 'Roadside', 'Terrace'], correctAnswer: 'Guest house' },
    { type: 'multiple_choice', text: 'Who teased Khushi about her blush after Arnav complimented her?', options: ['Payal', 'Buaji', 'NK', 'Anjali'], correctAnswer: 'Payal' },
    { type: 'true_false', text: 'Khushi once wrote Arnav’s name accidentally in her diary.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'What small gesture did Arnav do that Khushi treasured deeply?', options: ['Opening a door for her', 'Repairing her bangles', 'Bringing her tea', 'Tying her dori'], correctAnswer: 'Repairing her bangles' },
    { type: 'multiple_choice', text: 'During which festival did Arnav and Khushi have a soft sweet moment?', options: ['Holi', 'Janmashtami', 'Teej', 'Raksha Bandhan'], correctAnswer: 'Holi' },
    { type: 'multiple_choice', text: 'What does Khushi often do when she feels shy around Arnav?', options: ['Plays with her dupatta', 'Looks down', 'Talks fast', 'All of the above'], correctAnswer: 'All of the above' },
    { type: 'true_false', text: 'Arnav rarely complimented Khushi verbally in the early days.', correctAnswer: 'true' }
  ]
},
{
  title: 'Arnav & Khushi Quiz 5: Khushi’s Madness & Arnav’s Reactions',
  category: 'Entertainment',
  difficulty: 'Beginner',
  questions: [
    { type: 'multiple_choice', text: 'What crazy stunt did Khushi do that left Arnav speechless?', options: ['Jump on his car', 'Dance in the rain', 'Climb his office table', 'Break his laptop'], correctAnswer: 'Jump on his car' },
    { type: 'multiple_choice', text: 'What nickname did Khushi earn because of her eccentricity?', options: ['Sanka Devi', 'Drama Queen', 'Jalebi Maker', 'Miss Chaos'], correctAnswer: 'Sanka Devi' },
    { type: 'true_false', text: 'Arnav pretended not to care about her antics but secretly admired them.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'What did Khushi spill on Arnav that annoyed him?', options: ['Tea', 'Milkshake', 'Water', 'Coffee'], correctAnswer: 'Tea' },
    { type: 'multiple_choice', text: 'Which of these made Arnav lose his calm instantly?', options: ['Her pranks', 'Her singing', 'Her dancing', 'Her giggling'], correctAnswer: 'Her singing' },
    { type: 'true_false', text: 'Khushi once tied Arnav to a chair.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'Which challenge did Khushi give Arnav in the early days?', options: ['Smile challenge', 'Cooking challenge', 'Dance challenge', 'Arm wrestling'], correctAnswer: 'Smile challenge' },
    { type: 'multiple_choice', text: 'How did Arnav handle Khushi’s loud praying?', options: ['Ignored her', 'Told her to stop', 'Teased her', 'Left the room'], correctAnswer: 'Told her to stop' },
    { type: 'multiple_choice', text: 'Khushi often made Arnav angry but also made him feel…', options: ['Alive', 'Confused', 'Frustrated', 'Indebted'], correctAnswer: 'Alive' },
    { type: 'true_false', text: 'Arnav never smiled at Khushi’s antics in the early episodes.', correctAnswer: 'false' }
  ]
},
{
  title: 'Arnav & Khushi Quiz 6: Arnav’s Hidden Soft Side',
  category: 'Entertainment',
  difficulty: 'Advanced',
  questions: [
    { type: 'multiple_choice', text: 'Which moment revealed Arnav’s fear of losing Khushi?', options: ['Car accident scare', 'Temple scene', 'Guest house rescue', 'Kidnapping track'], correctAnswer: 'Car accident scare' },
    { type: 'multiple_choice', text: 'What did Arnav secretly keep that belonged to Khushi?', options: ['Her payal', 'Her dupatta', 'Her note', 'Her bangle'], correctAnswer: 'Her payal' },
    { type: 'true_false', text: 'Arnav once cancelled a meeting just to check on Khushi.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'What touched Khushi the most about Arnav’s care?', options: ['His silence', 'His protection', 'His gifts', 'His apologies'], correctAnswer: 'His protection' },
    { type: 'multiple_choice', text: 'When did Arnav cry seeing Khushi in danger?', options: ['During kidnapping', 'During Diwali', 'During sangeet', 'Poolside scene'], correctAnswer: 'During kidnapping' },
    { type: 'true_false', text: 'Arnav always denied his feelings even when he cared deeply.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'Which sickness brought out Arnav’s softest side?', options: ['Khushi’s fever', 'Her fainting', 'Her injury', 'Her food poisoning'], correctAnswer: 'Khushi’s fever' },
    { type: 'multiple_choice', text: 'Arnav’s biggest vulnerability around Khushi was…', options: ['Her tears', 'Her laughter', 'Her anger', 'Her silence'], correctAnswer: 'Her tears' },
    { type: 'multiple_choice', text: 'He surprised Khushi by doing which rare thing?', options: ['Cooking for her', 'Smiling without reason', 'Apologizing sincerely', 'Helping in the kitchen'], correctAnswer: 'Apologizing sincerely' },
    { type: 'true_false', text: 'Khushi was the only one who could calm Arnav instantly.', correctAnswer: 'true' }
  ]
},
{
  title: 'Arnav & Khushi Quiz 7: Comedy & Chaos',
  category: 'Entertainment',
  difficulty: 'Intermediate',
  questions: [
    { type: 'multiple_choice', text: 'Who walked in when Khushi fell into Arnav’s arms during Holi?', options: ['Anjali', 'NK', 'Nani', 'Mami'], correctAnswer: 'NK' },
    { type: 'multiple_choice', text: 'Khushi once mistook Arnav’s laptop for…', options: ['A serving tray', 'A cutting board', 'A mirror', 'A pillow'], correctAnswer: 'A cutting board' },
    { type: 'true_false', text: 'Arnav has been hit in the face by Khushi’s dupatta more than once.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'Which hilarious item did Khushi hide in Arnav’s cupboard?', options: ['Her tiffin', 'Rabri bowl', 'Gol gappe', 'Her diary'], correctAnswer: 'Rabri bowl' },
    { type: 'multiple_choice', text: 'Arnav once ended up wearing an odd accessory because of Khushi:', options: ['Clown nose', 'Red tika', 'Flower garland', 'Paper crown'], correctAnswer: 'Red tika' },
    { type: 'true_false', text: 'Khushi once made Arnav dance unintentionally.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'Who laughed the most at their chaotic fights?', options: ['NK', 'Payal', 'Anjali', 'Buaji'], correctAnswer: 'NK' },
    { type: 'multiple_choice', text: 'Khushi’s jalebi marathon was usually triggered by…', options: ['Stress', 'Anger at Arnav', 'Confusion', 'All of the above'], correctAnswer: 'All of the above' },
    { type: 'multiple_choice', text: 'Which silly fight became iconic?', options: ['Poolside water fight', 'Bedroom pillow fight', 'Kitchen flour fight', 'Office paper fight'], correctAnswer: 'Poolside water fight' },
    { type: 'true_false', text: 'Arnav hated every one of Khushi’s silly antics.', correctAnswer: 'false' }
  ]
},
{
  title: 'Arnav & Khushi Quiz 8: Romance After Marriage',
  category: 'Entertainment',
  difficulty: 'Intermediate',
  questions: [
    { type: 'multiple_choice', text: 'What was Arnav’s first romantic gift to Khushi post-marriage?', options: ['A saree', 'A pearl set', 'A star-shaped light', 'A letter'], correctAnswer: 'A pearl set' },
    { type: 'multiple_choice', text: 'Where did Arnav confess his love clearly?', options: ['Airport', 'Bedroom', 'Poolside', 'Temple'], correctAnswer: 'Airport' },
    { type: 'true_false', text: 'Khushi once planned a surprise date for Arnav.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'What romantic task did Arnav try for Khushi’s happiness?', options: ['Cooking jalebi', 'Dancing', 'Singing', 'Writing poetry'], correctAnswer: 'Dancing' },
    { type: 'multiple_choice', text: 'Which anniversary moment is iconic for them?', options: ['Rain confession', 'Rabba Ve slow dance', 'Poolside hug', 'Hidden letter exchange'], correctAnswer: 'Rabba Ve slow dance' },
    { type: 'true_false', text: 'Arnav loved Khushi’s handmade gifts more than expensive ones.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'What did Khushi do that made Arnav laugh uncontrollably?', options: ['Her Salman Khan act', 'Her dance', 'Her cooking disaster', 'Her joke'], correctAnswer: 'Her Salman Khan act' },
    { type: 'multiple_choice', text: 'Which celebration strengthened their bond?', options: ['Karva Chauth', 'Holi', 'Diwali', 'Teej'], correctAnswer: 'Karva Chauth' },
    { type: 'multiple_choice', text: 'What small habit of Arnav made Khushi blush repeatedly?', options: ['Tucking her hair', 'Calling her “Khushi” softly', 'Holding her hand unexpectedly', 'All of the above'], correctAnswer: 'All of the above' },
    { type: 'true_false', text: 'Khushi was the first to say “I love you” clearly.', correctAnswer: 'false' }
  ]
},
{
  title: 'Arnav & Khushi Quiz 9: Jealousy & Possessiveness',
  category: 'Entertainment',
  difficulty: 'Advanced',
  questions: [
    { type: 'multiple_choice', text: 'Arnav first felt jealous seeing Khushi with whom?', options: ['NK', 'Shyam', 'Aakash', 'Aman'], correctAnswer: 'NK' },
    { type: 'multiple_choice', text: 'Khushi got jealous when she saw Arnav with…', options: ['Lavanya', 'Sheetal', 'A random model', 'Payal'], correctAnswer: 'Lavanya' },
    { type: 'true_false', text: 'Arnav once admitted he didn’t like Khushi talking too much with NK.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'Which moment made Khushi realize Arnav’s possessiveness?', options: ['Car scene', 'Sangeet dance', 'Hospital scene', 'Diwali almost-kiss'], correctAnswer: 'Sangeet dance' },
    { type: 'multiple_choice', text: 'Who teased Arnav the most about being jealous?', options: ['NK', 'Anjali', 'Nani', 'Payal'], correctAnswer: 'Anjali' },
    { type: 'true_false', text: 'Khushi once faked jealousy to annoy Arnav.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'Arnav once told Khushi she belongs…', options: ['In his heart', 'With him only', 'Nowhere near trouble', 'To God'], correctAnswer: 'With him only' },
    { type: 'multiple_choice', text: 'Khushi’s jealousy peaked during which track?', options: ['Sheetal track', 'Kidnapping', 'Holi', 'Payal’s wedding'], correctAnswer: 'Sheetal track' },
    { type: 'multiple_choice', text: 'What did Arnav do when he saw someone flirting with Khushi?', options: ['Walked away angry', 'Held her hand', 'Confronted the guy', 'Stood beside her possessively'], correctAnswer: 'Stood beside her possessively' },
    { type: 'true_false', text: 'Jealousy often led to romantic Rabba Ve moments.', correctAnswer: 'true' }
  ]
},
{
  title: 'Arnav & Khushi Quiz 10: Emotional Breakdown & Healing',
  category: 'Entertainment',
  difficulty: 'Expert',
  questions: [
    { type: 'multiple_choice', text: 'When did Khushi first see Arnav cry?', options: ['When he saw Anjali hurt', 'During the kidnapping rescue', 'During his parents flashback', 'During Diwali'], correctAnswer: 'During his parents flashback' },
    { type: 'multiple_choice', text: 'What does Khushi do when Arnav breaks down emotionally?', options: ['Hugs him', 'Stays silent and listens', 'Calms him with her presence', 'All of the above'], correctAnswer: 'All of the above' },
    { type: 'true_false', text: 'Arnav revealed his childhood trauma to Khushi before he said “I love you.”', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'Which object symbolizes healing between them?', options: ['Stars mobile', 'Payal', 'Pearls', 'Diary'], correctAnswer: 'Stars mobile' },
    { type: 'multiple_choice', text: 'Khushi broke down emotionally when…', options: ['Arnav got kidnapped', 'He yelled at her unfairly', 'She felt unwanted in Shantivan', 'All of the above'], correctAnswer: 'All of the above' },
    { type: 'true_false', text: 'Arnav comforted Khushi by giving her space rather than talking.', correctAnswer: 'false' },
    { type: 'multiple_choice', text: 'After which moment did Arnav realize Khushi was his emotional anchor?', options: ['When she fasted for him', 'During the hospital hug', 'Diwali almost-kiss', 'Guest house rescue'], correctAnswer: 'During the hospital hug' },
    { type: 'multiple_choice', text: 'Khushi healed Arnav’s pain using…', options: ['Her jokes', 'Her innocence', 'Her stubborn love', 'All of the above'], correctAnswer: 'All of the above' },
    { type: 'true_false', text: 'Arnav trusted Khushi with his vulnerabilities before anyone else.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'Which track had their deepest emotional bonding?', options: ['Kidnapping', 'Sheetal track', 'Nainital trip', 'Office track'], correctAnswer: 'Kidnapping' }
  ]
},
{
  title: 'Arnav & Khushi Quiz 11: Iconic Dialogues & Expressions',
  category: 'Entertainment',
  difficulty: 'Beginner',
  questions: [
    { type: 'multiple_choice', text: 'Which epic line did Arnav say to Khushi during a heated moment?', options: ['“What the—”', '“Farak padta hai kyunki…”', '“Unbelievable!”', '“Tum theek ho?”'], correctAnswer: '“Farak padta hai kyunki…”' },
    { type: 'multiple_choice', text: 'Khushi’s most repeated expression around Arnav was…', options: ['“Hey Devi Maiyya!”', '“Aap?”', '“Nahin!”', '“Achha?”'], correctAnswer: '“Hey Devi Maiyya!”' },
    { type: 'true_false', text: 'Arnav often shut Khushi up with a single intense stare.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'Which phrase did Arnav whisper during romantic scenes?', options: ['“Khushi…”', '“Stop talking.”', '“Come here.”', '“Don’t move.”'], correctAnswer: '“Khushi…”' },
    { type: 'multiple_choice', text: 'Which reply did Khushi give Arnav often?', options: ['“Aap humein dara rahe hain.”', '“Hum jaa rahe hain!”', '“Aapko kya farak padta hai?”', 'All of the above'], correctAnswer: 'All of the above' },
    { type: 'true_false', text: '“Aap pagal hain!” was used by Khushi for Arnav more than once.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'What expression of Arnav made Khushi nervous?', options: ['His eyebrow lift', 'His smirk', 'His glare', 'His soft smile'], correctAnswer: 'His smirk' },
    { type: 'multiple_choice', text: 'Khushi’s cutest reaction whenever Arnav came too close was…', options: ['Eyes widening', 'Gasping', 'Stepping back', 'All of the above'], correctAnswer: 'All of the above' },
    { type: 'true_false', text: '“What the—” was reserved mostly for Khushi.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'Which dialogue from Khushi left Arnav speechless?', options: ['“Aap humari parwah karte hain.”', '“Hum aapse darte nahin.”', '“Hum aapko maaf karte hain.”', '“Hum aapse…”'], correctAnswer: '“Hum aapse…”' }
  ]
},
{
  title: 'Arnav & Khushi Quiz 12: Family Drama & Teamwork',
  category: 'Entertainment',
  difficulty: 'Intermediate',
  questions: [
    { type: 'multiple_choice', text: 'Who accepted Khushi first in Shantivan?', options: ['Nani', 'Anjali', 'Aakash', 'NK'], correctAnswer: 'NK' },
    { type: 'multiple_choice', text: 'Which family event made Arnav and Khushi work together?', options: ['Payal’s wedding', 'Anjali’s birthday', 'Holi celebrations', 'Karva Chauth'], correctAnswer: 'Payal’s wedding' },
    { type: 'true_false', text: 'Khushi unintentionally repaired Arnav’s bond with Nani.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'Arnav supported Khushi during which family misunderstanding?', options: ['Kitchen accident', 'Mami’s blame game', 'Payal’s marriage issue', 'Nani’s health scare'], correctAnswer: 'Mami’s blame game' },
    { type: 'multiple_choice', text: 'Who shipped Arnav & Khushi from day one?', options: ['Anjali', 'NK', 'Nani', 'HP (the servant)'], correctAnswer: 'Anjali' },
    { type: 'true_false', text: 'Khushi once solved a major family problem all by herself.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'Where did Arnav defend Khushi in front of the family?', options: ['Dining table', 'Living room', 'Temple', 'Kitchen'], correctAnswer: 'Dining table' },
    { type: 'multiple_choice', text: 'What tradition did Khushi bring into Shantivan?', options: ['Temple mornings', 'Sweet distribution', 'DIY decorations', 'All of the above'], correctAnswer: 'All of the above' },
    { type: 'multiple_choice', text: 'Arnav and Khushi united to expose…', options: ['Shyam', 'Manorama’s lie', 'Aakash’s friend', 'Sheetal'], correctAnswer: 'Shyam' },
    { type: 'true_false', text: 'Family chaos often brought Arnav & Khushi closer.', correctAnswer: 'true' }
  ]
},
{
  title: 'Arnav & Khushi Quiz 13: The Best Fights & Patch-Ups',
  category: 'Entertainment',
  difficulty: 'Intermediate',
  questions: [
    { type: 'multiple_choice', text: 'Their funniest fight took place over…', options: ['Poolside water', 'Who should sleep on the bed', 'The closet space', 'Tea vs. coffee'], correctAnswer: 'Who should sleep on the bed' },
    { type: 'multiple_choice', text: 'Who apologized first more often?', options: ['Arnav', 'Khushi', 'Neither', 'Both equally'], correctAnswer: 'Khushi' },
    { type: 'true_false', text: 'Arnav once apologized by bringing jalebi for Khushi.', correctAnswer: 'false' },
    { type: 'multiple_choice', text: 'Which silly argument always returned?', options: ['Lights on/off', 'Poolside usage', 'Cupboard rights', 'Cooking vs. ordering food'], correctAnswer: 'Poolside usage' },
    { type: 'multiple_choice', text: 'What did Arnav do to win back Khushi after a big fight?', options: ['Said sorry softly', 'Held her hand', 'Gave her gifts', 'All of the above'], correctAnswer: 'All of the above' },
    { type: 'true_false', text: 'Khushi always avoided fights, while Arnav initiated them.', correctAnswer: 'false' },
    { type: 'multiple_choice', text: 'Their most iconic fight happened during…', options: ['Diwali', 'Holi', 'Teej', 'Sangeet'], correctAnswer: 'Holi' },
    { type: 'multiple_choice', text: 'What was their fastest patch-up gesture?', options: ['Eye contact', 'Hand holding', 'A smile', 'A hug'], correctAnswer: 'A smile' },
    { type: 'multiple_choice', text: 'Khushi melts fastest when Arnav…', options: ['Says sorry', 'Looks guilty', 'Touches her gently', 'Smiles softly'], correctAnswer: 'Smiles softly' },
    { type: 'true_false', text: 'Most fights ended with Rabba Ve moments.', correctAnswer: 'true' }
  ]
},
{
  title: 'Arnav & Khushi Quiz 14: Secrets, Confessions & Realizations',
  category: 'Entertainment',
  difficulty: 'Advanced',
  questions: [
    { type: 'multiple_choice', text: 'What secret did Khushi discover about Arnav that changed her perception of him?', options: ['His parents’ death', 'His fear of darkness', 'His past love', 'His business failure'], correctAnswer: 'His parents’ death' },
    { type: 'multiple_choice', text: 'What moment made Arnav realize he cannot live without Khushi?', options: ['Car accident scare', 'Her leaving Shantivan', 'Kidnapping track', 'Diwali moment'], correctAnswer: 'Her leaving Shantivan' },
    { type: 'true_false', text: 'Khushi confessed her love to Arnav first.', correctAnswer: 'false' },
    { type: 'multiple_choice', text: 'Arnav’s first soft confession was…', options: ['“Khushi, I care.”', '“Farak padta hai.”', '“Don’t leave me.”', '“I’m sorry.”'], correctAnswer: '“Farak padta hai.”' },
    { type: 'multiple_choice', text: 'Khushi realized her feelings for Arnav when…', options: ['He got hurt', 'He saved her repeatedly', 'She couldn’t see him in pain', 'All of the above'], correctAnswer: 'All of the above' },
    { type: 'true_false', text: 'Arnav openly confessed his love during a near-death moment.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'What secret of Khushi’s affected Arnav deeply?', options: ['Her engagement to Shyam', 'Her adoption story', 'Her parents’ past', 'Her health'], correctAnswer: 'Her engagement to Shyam' },
    { type: 'multiple_choice', text: 'Which moment forced Arnav to confront his feelings?', options: ['Nainital trip', 'Rain hug', 'Hospital scene', 'Guest house rescue'], correctAnswer: 'Guest house rescue' },
    { type: 'multiple_choice', text: 'Arnav broke his walls when…', options: ['Khushi cried', 'She got injured', 'She fainted', 'He saw her dance'], correctAnswer: 'Khushi cried' },
    { type: 'true_false', text: 'Confessions in their relationship happened slowly but powerfully.', correctAnswer: 'true' }
  ]
},
{
  title: 'Arnav & Khushi Quiz 15: Travel, Adventures & Misadventures',
  category: 'Entertainment',
  difficulty: 'Intermediate',
  questions: [
    { type: 'multiple_choice', text: 'Where did Arnav and Khushi share their first major adventure?', options: ['Nainital', 'Lucknow', 'Lonavala', 'Agra'], correctAnswer: 'Nainital' },
    { type: 'multiple_choice', text: 'Which mishap led to them being stuck together during travel?', options: ['Tyre puncture', 'Lost keys', 'Storm', 'Empty petrol'], correctAnswer: 'Tyre puncture' },
    { type: 'true_false', text: 'Khushi once forced Arnav to sleep on a broken bed during a trip.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'What did Arnav do during the Nainital trip that shocked Khushi?', options: ['Cooked food', 'Slept on the floor', 'Apologized softly', 'Protected her fiercely'], correctAnswer: 'Apologized softly' },
    { type: 'multiple_choice', text: 'Khushi’s funniest travel mistake was…', options: ['Running into strangers', 'Packing too much food', 'Talking to animals', 'Jumping out of the car'], correctAnswer: 'Packing too much food' },
    { type: 'true_false', text: 'One of their earliest road trips ended with a Rabba Ve moment.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'Which mode of transport caused chaos between them?', options: ['Scooter', 'Auto-rickshaw', 'Bus', 'Train'], correctAnswer: 'Scooter' },
    { type: 'multiple_choice', text: 'On which trip did Khushi demand Arnav carry her?', options: ['Nainital', 'Temple trip', 'Late-night roadside rescue', 'Kidnapping escape'], correctAnswer: 'Temple trip' },
    { type: 'multiple_choice', text: 'Who typically made the travel plans?', options: ['Arnav', 'Khushi', 'Anjali', 'No one—it was all accidental'], correctAnswer: 'No one—it was all accidental' },
    { type: 'true_false', text: 'Arnav secretly enjoyed traveling with Khushi despite the chaos.', correctAnswer: 'true' }
  ]
},
{
  title: 'Arnav & Khushi Quiz 16: Food Fights, Kitchen Romance & Jalebis',
  category: 'Entertainment',
  difficulty: 'Beginner',
  questions: [
    { type: 'multiple_choice', text: 'What food item is Khushi obsessed with?', options: ['Jalebi', 'Kachori', 'Samosa', 'Gulab jamun'], correctAnswer: 'Jalebi' },
    { type: 'multiple_choice', text: 'What is Arnav’s food preference?', options: ['Sugar-free desserts', 'Spicy food', 'Anything Khushi cooks', 'Chaats'], correctAnswer: 'Sugar-free desserts' },
    { type: 'true_false', text: 'Khushi once tried to make Arnav eat spicy food as a prank.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'Which kitchen scene became unexpectedly romantic?', options: ['Flour scene', 'Burnt jalebi scene', 'Cooking lesson', 'Spill scene'], correctAnswer: 'Flour scene' },
    { type: 'multiple_choice', text: 'What did Arnav secretly love that Khushi cooked?', options: ['Pooris', 'Jalebi', 'Pakoras', 'Kheer'], correctAnswer: 'Pooris' },
    { type: 'true_false', text: 'Arnav once tried to make jalebi for Khushi.', correctAnswer: 'false' },
    { type: 'multiple_choice', text: 'Khushi fed Arnav food with her hands during…', options: ['Karva Chauth', 'Holi', 'Their anniversary', 'Sangeet'], correctAnswer: 'Karva Chauth' },
    { type: 'multiple_choice', text: 'Arnav’s biggest kitchen complaint was…', options: ['Khushi’s mess', 'Burning smells', 'Noise', 'Too many jalebis'], correctAnswer: 'Khushi’s mess' },
    { type: 'multiple_choice', text: 'Which incident made Arnav tease Khushi endlessly?', options: ['Salt instead of sugar', 'Overburnt poori', 'Exploding cooker', 'Spilling milk'], correctAnswer: 'Salt instead of sugar' },
    { type: 'true_false', text: 'Food mishaps often led to cute patch-up hugs.', correctAnswer: 'true' }
  ]
},
{
  title: 'Arnav & Khushi Quiz 17: Romance Through Touch',
  category: 'Entertainment',
  difficulty: 'Advanced',
  questions: [
    { type: 'multiple_choice', text: 'Which physical gesture Arnav used most to comfort Khushi?', options: ['Forehead touch', 'Hand holding', 'Back hug', 'Cheek caress'], correctAnswer: 'Hand holding' },
    { type: 'multiple_choice', text: 'Khushi’s most iconic touch moment was…', options: ['Tying his tie', 'Fixing his collar', 'Applying tika', 'Stopping him by holding his hand'], correctAnswer: 'Stopping him by holding his hand' },
    { type: 'true_false', text: 'Khushi often pulled her hand away first during romantic moments.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'Arnav pulled Khushi closer by her waist during…', options: ['Diwali', 'Holi', 'Sangeet', 'Rain scene'], correctAnswer: 'Holi' },
    { type: 'multiple_choice', text: 'What made Khushi’s heartbeat race the most?', options: ['Arnav whispering', 'Arnav tucking her hair', 'Arnav holding her shoulders', 'Arnav brushing past her'], correctAnswer: 'Arnav tucking her hair' },
    { type: 'true_false', text: 'Arnav used physical proximity to express love when words failed.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'Their first official hug happened during…', options: ['Hospital track', 'Post-marriage', 'Diwali', 'Kidnapping arc'], correctAnswer: 'Hospital track' },
    { type: 'multiple_choice', text: 'What did Khushi do that surprised Arnav the most?', options: ['Hugged him tightly', 'Kissed his cheek', 'Held his face', 'Held his hand in public'], correctAnswer: 'Hugged him tightly' },
    { type: 'multiple_choice', text: 'Which accidental touch became iconic?', options: ['Falling on each other', 'Skirt zip scene', 'Dupatta pull', 'Hand brush'], correctAnswer: 'Dupatta pull' },
    { type: 'true_false', text: 'Most intense Rabba Ve moments involve touch.', correctAnswer: 'true' }
  ]
},
{
  title: 'Arnav & Khushi Quiz 18: Festival Love Story',
  category: 'Entertainment',
  difficulty: 'Intermediate',
  questions: [
    { type: 'multiple_choice', text: 'Which festival marked their first deep emotional moment?', options: ['Diwali', 'Holi', 'Teej', 'Janmashtami'], correctAnswer: 'Diwali' },
    { type: 'multiple_choice', text: 'Which festival had their most playful romance?', options: ['Holi', 'Raksha Bandhan', 'Karva Chauth', 'Lohri'], correctAnswer: 'Holi' },
    { type: 'true_false', text: 'Arnav kept a fast for Khushi secretly during Karva Chauth.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'During Teej, Khushi…', options: ['Fainted', 'Danced for Arnav', 'Pranked Arnav', 'Confessed feelings'], correctAnswer: 'Fainted' },
    { type: 'multiple_choice', text: 'Which festival gave them a Rabba Ve moment near diyas?', options: ['Diwali', 'Holi', 'Teej', 'Navratri'], correctAnswer: 'Diwali' },
    { type: 'true_false', text: 'Arnav dislikes festivals but still celebrates because of Khushi.', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'Arnav gifted Khushi what during Holi?', options: ['A gulal mark', 'A saree', 'A hug', 'A love confession'], correctAnswer: 'A gulal mark' },
    { type: 'multiple_choice', text: 'Which festival made Khushi emotional?', options: ['Diwali', 'Raksha Bandhan', 'Karva Chauth', 'Holi'], correctAnswer: 'Karva Chauth' },
    { type: 'multiple_choice', text: 'Which festival event caused the most jealousy?', options: ['Sangeet dance-offs', 'Holi flirting', 'Diwali lights', 'Teej rituals'], correctAnswer: 'Sangeet dance-offs' },
    { type: 'true_false', text: 'Every festival in the show ended with an Arnav–Khushi moment.', correctAnswer: 'true' }
  ]
},
{
  title: 'क्विज़ 19: दिल की धड़कनें — अरनव और खुशी के रोमांटिक लम्हे',
  category: 'Entertainment',
  difficulty: 'Intermediate',
  questions: [
    { type: 'multiple_choice', text: 'दीवाली के दौरान अरनव ने खुशी को देखकर सबसे पहले क्या कहा था?', options: ['तुम ठीक हो?', 'तुम... बहुत अच्छी लग रही हो।', 'क्या कर रही हो?', 'हटो यहाँ से।'], correctAnswer: 'तुम... बहुत अच्छी लग रही हो।' },
    { type: 'multiple_choice', text: 'कौन-सा पल खुशी को एहसास कराता है कि अरनव उससे प्रेम करता है?', options: ['वह उसे बारिश से बचाता है', 'वह उसे अपनी जैकेट देता है', 'वह उसे गिरने से पकड़ता है', 'वह उसे मंदिर ले जाता है'], correctAnswer: 'वह उसे गिरने से पकड़ता है' },
    { type: 'true_false', text: 'अरनव ने पहली बार खुशी का हाथ तब पकड़ा था जब वह डर गई थी।', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'खुशी को अरनव का कौन-सा अंदाज़ सबसे ज़्यादा रोमांटिक लगता है?', options: ['धीरे से नाम लेना', 'बाल कान के पीछे करना', 'गुस्से में घूरना', 'मुस्कुराना'], correctAnswer: 'बाल कान के पीछे करना' },
    { type: 'multiple_choice', text: 'अरनव ने पहली बार खुशी को कब कसकर गले लगाया?', options: ['अस्पताल वाला दृश्य', 'दीवाली', 'नैनिताल ट्रिप', 'किडनैपिंग ट्रैक'], correctAnswer: 'अस्पताल वाला दृश्य' },
    { type: 'true_false', text: 'खुशी हमेशा अरनव के प्यार भरे इशारों पर पहले शर्माती है।', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'कौन-सा रोमांटिक पल अरनव के लिए सबसे अनियंत्रित था?', options: ['दीवाली की लाइट्स के बीच पास आना', 'खुशी को झटका लगने पर पकड़ना', 'होली के रंग लगाना', 'बारिश में उसके पास खड़ा होना'], correctAnswer: 'दीवाली की लाइट्स के बीच पास आना' },
    { type: 'multiple_choice', text: 'खुशी की कौन-सी आदत अरनव को दिल से मुस्कुराने पर मजबूर करती है?', options: ['उसकी हँसी', 'उसकी दुआएँ', 'उसकी मासूमियत', 'सब'], correctAnswer: 'सब' },
    { type: 'multiple_choice', text: 'अरनव ने कब पहली बार खुशी को महसूस कराया कि वह अकेली नहीं है?', options: ['जब वह रो रही थी', 'जब वह बेहोश हुई', 'जब वह नाराज़ थी', 'जब वह घर छोड़ने वाली थी'], correctAnswer: 'जब वह रो रही थी' },
    { type: 'true_false', text: 'अरनव और खुशी के हर रोमांटिक पल के पीछे “रब्बा वे” बजता था।', correctAnswer: 'true' }
  ]
},
{
  title: 'क्विज़ 20: शादी, रस्में और प्यार की क़समें — अरनव और खुशी',
  category: 'Entertainment',
  difficulty: 'Intermediate',
  questions: [
    { type: 'multiple_choice', text: 'अरनव ने खुशी से शादी किस वजह से की थी?', options: ['गलतफ़हमी', 'परिवार का दवाब', 'खुशी की जिद', 'शर्त'], correctAnswer: 'गलतफ़हमी' },
    { type: 'multiple_choice', text: 'खुशी ने अरनव के लिए पहली कौन-सी रस्म दिल से निभाई?', options: ['कर्वाचौथ', 'हल्दी', 'मेहंदी', 'तेज'], correctAnswer: 'कर्वाचौथ' },
    { type: 'true_false', text: 'अरनव ने कर्वाचौथ पर खुशी के लिए चुपचाप व्रत रखा था।', correctAnswer: 'true' },
    { type: 'multiple_choice', text: 'शादी के बाद अरनव–खुशी का पहला मीठा पल कहाँ हुआ?', options: ['पूल के पास', 'रसोई में', 'कमरे में', 'छत पर'], correctAnswer: 'पूल के पास' },
    { type: 'multiple_choice', text: 'खुशी की किस रस्म को अरनव ने सबसे ज़्यादा प्यारा कहा?', options: ['दीये सजाना', 'तुलसी पूजा', 'मेहंदी', 'सिंदूर लगाना'], correctAnswer: 'दीये सजाना' },
    { type: 'true_false', text: 'शादी की पहली रात अरनव ने खुशी को फूलों से सजाए कमरे से बाहर भेज दिया था।', correctAnswer: 'false' },
    { type: 'multiple_choice', text: 'किस रस्म के दौरान अरनव ने खुशी का हाथ कसकर पकड़ा था?', options: ['फेरे', 'सात वचन', 'मुंह दिखाई', 'गृह प्रवेश'], correctAnswer: 'गृह प्रवेश' },
    { type: 'multiple_choice', text: 'अरनव को शादी के बाद खुशी के कमरे में सबसे प्यारी चीज़ क्या लगी?', options: ['सितारों वाली लाइट्स', 'उसका रंगीन बिस्तर', 'उसके गॉडजी फ़िगर्स', 'उसकी डायरी'], correctAnswer: 'सितारों वाली लाइट्स' },
    { type: 'multiple_choice', text: 'कौन-सी शादी की रस्म ने खुशी को सबसे ज़्यादा भावुक कर दिया?', options: ['सिंदूर', 'मंगलसूत्र', 'फेरे', 'विदाई'], correctAnswer: 'सिंदूर' },
    { type: 'true_false', text: 'शादी के बाद अरनव और खुशी की जिंदगी पहले से ज़्यादा मज़ेदार और रोमांटिक हो गई।', correctAnswer: 'true' }
  ]
}
];


// Wait for DB to be ready
setTimeout(async () => {
    try {

        const systemUserId = 17;

        // Seed IPPKND quizzes as published
        console.log('\n📚 Seeding IPPKND quizzes...');
        for (const quizData of ippkndQuizzes) {
            // Create quiz with System as creator, status 'approved', is_public = 1
            const quizId = await new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO quizzes (title, category, difficulty, creator_id, status, is_public) VALUES (?, ?, ?, ?, ?, ?)',
                    [quizData.title, quizData.category, quizData.difficulty, systemUserId, 'approved', 1],
                    function (err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });
            console.log(`  ✓ Created: ${quizData.title} (ID: ${quizId})`);

            // Add questions
            for (const q of quizData.questions) {
                await new Promise((resolve, reject) => {
                    const options = q.type === 'multiple_choice' ? JSON.stringify(q.options) : null;
                    db.run(
                        'INSERT INTO questions (quiz_id, type, question_text, options, correct_answer) VALUES (?, ?, ?, ?, ?)',
                        [quizId, q.type, q.text, options, q.correctAnswer],
                        function (err) {
                            if (err) reject(err);
                            else resolve(this.lastID);
                        }
                    );
                });
            }
            console.log(` → Added ${quizData.questions.length} questions`);
        }
    } 
    catch (error) {
        console.error('Error seeding IPPKND quizzes:', error);
    }
}, 1000);
