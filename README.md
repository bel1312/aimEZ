# Aim Trainer

A versatile web-based aim training application designed to help you improve your mouse accuracy, speed, and control for FPS and other games requiring precise aiming.

![Aim Trainer Screenshot](https://via.placeholder.com/800x400?text=Aim+Trainer+Screenshot)

## Features

- **Multiple Training Modes**: Five distinct training modes to develop different aiming skills
- **Customizable Settings**: Adjust difficulty levels, target durations, and movement patterns
- **Performance Tracking**: Track your score, accuracy, and streaks in real-time
- **Visual Feedback**: Immediate visual feedback for hits, misses, and performance

## Game Modes

### Standard Mode

Basic target practice where targets appear in random positions. Click them as quickly as possible to improve your reaction time and accuracy.

- **Customization**: Adjust target duration

### Quick Scope Mode

Simulates the "quick scoping" technique from FPS games. Your cursor is reset to the center after each shot, and you must quickly move to and click targets.

- **Features**: Uses pointer lock for more accurate mouse movement
- **Customization**: Adjust target duration

### Moving Target Mode

Practice tracking and hitting moving targets that bounce around the screen.

- **Customization**: Adjust target speed (Slow, Medium, Fast, Very Fast)
- **Features**: Targets follow realistic physics with bouncing and smooth animation

### Quick Reflex Mode

Test your reaction time by clicking as soon as the screen turns green. Provides detailed statistics on your reaction times.

- **Features**: Measures reaction time in milliseconds
- **Stats**: Shows individual round times and average reaction time

### Flick Shot Mode

Targets appear at the edges or corners of the screen, requiring quick "flick" movements to hit them. Features a combo system for consecutive hits.

- **Customization**: Three difficulty levels (Easy, Medium, Hard)
- **Scoring**: Combo system rewards consecutive hits with bonus points
- **Features**: Visual combo counter and effects

### Tracking Mode

Practice smooth mouse control by keeping your cursor on a continuously moving target. The longer you stay on target, the higher your score multiplier.

- **Customization**: Four movement patterns (Linear, Circular, Random, Zig-Zag)
- **Scoring**: Streak-based scoring with multipliers up to 5x
- **Features**: Visual feedback when successfully tracking

## How to Use

1. Select a game mode from the dropdown menu
2. Configure any available settings for your chosen mode
3. Click "Start Game" to begin
4. Try to achieve the highest score possible in the 30-second time limit
5. View your results when the game ends

## Scoring System

- **Standard, Quick Scope, Moving Target**: +1 point per hit
- **Flick Shot**: +1 point per hit, with bonus points for combos (up to +4 per hit)
- **Tracking**: Points accumulate while cursor remains on target, with multipliers for longer streaks
- **Quick Reflex**: Measures reaction time rather than score

## Tips for Improvement

- **Practice regularly**: Short, frequent sessions are more effective than long, infrequent ones
- **Start slow**: Focus on accuracy before speed
- **Vary your training**: Use different modes to develop all aspects of aiming
- **Track progress**: Pay attention to your scores and accuracy to measure improvement
- **Adjust settings**: Gradually increase difficulty as you improve

## Technical Details

- Built with vanilla JavaScript, HTML, and CSS
- No external libraries or dependencies required
- Uses requestAnimationFrame for smooth animations
- Compatible with all modern browsers

## Future Enhancements

- User accounts and persistent statistics
- Global leaderboards
- Additional game modes
- Customizable target appearance
- Sound effects and visual themes

## License

MIT License - Feel free to use, modify, and distribute this project.

## Acknowledgements

Created as a web-based alternative to popular aim training software, inspired by games like Aim Lab, KovaaK's, and OSU!
