# Bushfire command
## The Brief
Welcome to the emergency response center for The Valley. It is the peak of a very dry summer, and a brush fire has just been reported on the eastern ridge, approximately two kilometers from our town limits. While the fire is currently small, the conditions are ripe for it to spread. You have been convened as the town’s emergency leadership team to monitor the situation, coordinate resources, and ensure the safety of our citizens. Your goal is not to physically put out the fire yourselves, but to manage the town's response, keep the public informed, and make critical decisions as the situation evolves.

## Role Descriptions (Send privately to individuals)
* Mayor (Incident Commander): You are the ultimate decision-maker for The Valley and oversee the entire emergency response effort. Your job is to facilitate communication between all departments, resolve conflicts, and make the final call on actions.
* Firefighter (Subject Matter Expert): You command the fire crews on the ground and are responsible for the tactical strategy to contain the blaze. You have the most direct knowledge of the fire's behavior, its physical threat level, and the safety of the first responders. The fire is currently under control and is about 2km from the town limits. Your crews are successfully digging firebreaks.
* Police officer (Subject Matter Expert): You are in charge of public order, traffic control, and logistics. If an evacuation is ordered, it is your responsibility to secure safe routes and ensure the citizens leave the town efficiently and safely. You are able to evacuate people.
* Radio Host (Communications Manager): You are the primary source of news for the citizens of The Valley. Your job is to translate the technical updates from the response team into clear, calm, and accurate public broadcasts to prevent panic.
* Meteorologist (Subject Matter Expert): You monitor weather patterns, wind speeds, and humidity levels. Your data and forecasting are critical for predicting the fire's movement and giving the rest of the team early warnings of changing conditions. Current winds are mild at 10 km/h blowing East, which is gently pushing the fire away from the residential areas.

## Scenario Prompts
* To Firefighter: The fire has moved 5 meters, but its still under control.
* To Radio Host: Some listeners are calling into your station reporting panic, and a rumor is going viral on social media that the fire has destroyed the town's water supply.
### Phase 2: The Escalation (10-15 minutes in)
* To Meteorologist: Urgent update—a sudden dry weather front has moved in, and winds have suddenly shifted West directly toward the town, gusting up to 65 km/h.
* To Firefighter: The sudden wind shift has caused the fire to jump your containment lines. The fire is now completely out of control and advancing rapidly toward the eastern suburbs.
### Phase 3: The Crisis (25-30 minutes in)
* To Police Chief: People in the eastern suburbs can see the smoke and are beginning to panic. The main highway out of town is starting to experience severe traffic congestion and minor accidents.
* To Mayor: The fire is now just 500 meters from the edge of town, and visibility is dropping due to heavy smoke. 
### Phase 4:
* To Firefighter: The fire has now engulfed the town

## Widgets
1. Generic static map of the valley (everyone sees this - use the image asset generator system to make a nice map)
2. Status page (everyone) - a text feed of updates which the radio host submits
3. Weather status updates (meterologist only) - include text feed of updates, and also emojis/graphics for the current weather state
4. Radio host widget (radio host only) - input box and button to submit updates to the status page. Also includes a feed of what listeners are saying.
5. Police view (police only) - feed of text updates which police see (eg that there is road congestion). Also includes action buttons.
6. Firefighter view (firefighter only) - feed of text updates about the fire front, mostly represented visually with different images of the map with fire moving across it over time. Also includes action buttons, and amount of water remaining in trucks.